/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6544/javascript

import type { Rule } from 'eslint';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { getESLintCoreRule } from '../external/core.js';
import {
  areEquivalent,
  findFirstMatchingLocalAncestor,
  FUNCTION_NODES,
  generateMeta,
  getMainFunctionTokenLocation,
  interceptReport,
  mergeRules,
  RuleContext,
} from '../helpers/index.js';
import type { TSESTree } from '@typescript-eslint/utils';
import * as meta from './generated-meta.js';

/**
 * We keep a single occurrence of issues raised by both rules, discarding the ones raised by 'no-async-promise-executor'
 * The current logic relies on the fact that the listener of 'no-misused-promises' runs first because
 * it is alphabetically "smaller", which is how we set them up in mergeRules.
 */

/**
 * Checks if the reported node is part of a lazy initialization pattern,
 * e.g. `if (!cachedPromise) { cachedPromise = fetch(...); }`.
 * The upstream rule flags Promise-typed variables in conditionals, but when
 * the same variable is assigned inside the if-body, the check is testing
 * whether the Promise has been created yet, not evaluating its resolved value.
 */
function isLazyInitialization(node: TSESTree.Node, context: Rule.RuleContext): boolean {
  if (node.type !== 'Identifier' && node.type !== 'MemberExpression') {
    return false;
  }
  const ifStatement = findFirstMatchingLocalAncestor(node, n => n.type === 'IfStatement') as
    | TSESTree.IfStatement
    | undefined;
  if (!ifStatement) {
    return false;
  }
  return blockContainsAssignmentTo(ifStatement.consequent, node, context);
}

function blockContainsAssignmentTo(
  block: TSESTree.Statement,
  variable: TSESTree.Node,
  context: Rule.RuleContext,
): boolean {
  const statements = block.type === 'BlockStatement' ? block.body : [block];
  return statements.some(stmt => statementAssignsTo(stmt, variable, context));
}

function statementAssignsTo(
  stmt: TSESTree.Statement,
  variable: TSESTree.Node,
  context: Rule.RuleContext,
): boolean {
  if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
    return areEquivalent(stmt.expression.left, variable, context.sourceCode);
  }
  return false;
}

/**
 * start offsets of nodes that raised issues in typescript-eslint's no-misused-promises
 */
const flaggedNodeStarts = new Map();

/**
 * Handles reporting for descriptors with a 'node' property.
 * Checks for lazy initialization pattern and deduplicates reports.
 */
function handleNodeDescriptor(
  context: Rule.RuleContext,
  descriptor: Parameters<Parameters<typeof interceptReport>[1]>[1],
): void {
  if (!('node' in descriptor)) {
    return;
  }
  const node = descriptor.node as TSESTree.Node;
  if (
    'messageId' in descriptor &&
    descriptor.messageId === 'conditional' &&
    isLazyInitialization(node, context)
  ) {
    return;
  }
  const start = node.range[0];
  if (!flaggedNodeStarts.get(start)) {
    flaggedNodeStarts.set(start, true);
    if (FUNCTION_NODES.includes(node.type)) {
      const loc = getMainFunctionTokenLocation(
        node as TSESTree.FunctionLike,
        node.parent,
        context as unknown as RuleContext,
      );
      context.report({ ...descriptor, loc });
    } else {
      context.report(descriptor);
    }
  }
}

/**
 * Handles reporting for descriptors with a 'loc' property.
 * Deduplicates reports based on location.
 */
function handleLocDescriptor(
  context: Rule.RuleContext,
  descriptor: Parameters<Parameters<typeof interceptReport>[1]>[1],
): void {
  if (!('loc' in descriptor)) {
    return;
  }
  const loc = descriptor.loc;
  let start: number;
  if (typeof loc === 'object' && 'line' in loc) {
    start = context.sourceCode.getIndexFromLoc(loc);
  } else if (typeof loc === 'object' && 'start' in loc) {
    start = context.sourceCode.getIndexFromLoc(loc.start);
  } else {
    start = 0;
  }
  if (!flaggedNodeStarts.get(start)) {
    flaggedNodeStarts.set(start, true);
    context.report(descriptor);
  }
}

const noMisusedPromisesRule = tsEslintRules['no-misused-promises'];
const decoratedNoMisusedPromisesRule = interceptReport(
  noMisusedPromisesRule,
  (context, descriptor) => {
    if ('node' in descriptor) {
      handleNodeDescriptor(context, descriptor);
    } else {
      handleLocDescriptor(context, descriptor);
    }
  },
);

const noAsyncPromiseExecutorRule = getESLintCoreRule('no-async-promise-executor');
const decoratedNoAsyncPromiseExecutorRule = interceptReport(
  noAsyncPromiseExecutorRule,
  (context, descriptor) => {
    if ('node' in descriptor) {
      const start = (descriptor.node as TSESTree.Node).range[0];
      if (!flaggedNodeStarts.get(start)) {
        context.report(descriptor);
      }
    }
  },
);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      ...decoratedNoMisusedPromisesRule.meta!.messages,
      ...decoratedNoAsyncPromiseExecutorRule.meta!.messages,
    },
    schema: [
      {
        type: 'object',
        properties: {},
      },
    ],
  }),
  create(context: Rule.RuleContext) {
    return {
      'Program:exit': () => {
        flaggedNodeStarts.clear();
      },
      ...mergeRules(
        decoratedNoAsyncPromiseExecutorRule.create(context),
        decoratedNoMisusedPromisesRule.create(context),
      ),
    };
  },
};
