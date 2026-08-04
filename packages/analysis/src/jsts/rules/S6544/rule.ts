/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import type estree from 'estree';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { getESLintCoreRule } from '../external/core.js';
import type { RuleContext } from '../helpers/type.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { findFirstMatchingLocalAncestor } from '../helpers/ancestor.js';
import { FUNCTION_NODES } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getMainFunctionTokenLocation } from '../helpers/location.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { mergeRules } from '../helpers/decorators/merger.js';
import type { TSESTree } from '@typescript-eslint/utils';
import * as meta from './generated-meta.js';
import {
  type FunctionNodeType,
  getValueOfExpression,
  getVariableFromName,
  isIdentifier,
  resolveFunction,
} from '../helpers/ast.js';
import { getFullyQualifiedName, isRequire } from '../helpers/module.js';

/**
 * We keep a single occurrence of issues raised by both rules, discarding the ones raised by 'no-async-promise-executor'
 * The current logic relies on the fact that the listener of 'no-misused-promises' runs first because
 * it is alphabetically "smaller", which is how we set them up in mergeRules.
 */

/**
 * start offsets of nodes that raised issues in typescript-eslint's no-misused-promises
 */
const flaggedNodeStarts = new Map();

const LIBRARY_PREDICATE_MESSAGE =
  'Do not use an asynchronous predicate with a synchronous collection method; the returned Promise makes the predicate result truthy.';

const SUPPORTED_LIBRARY_PREDICATES = new Set([
  'lodash.every',
  'lodash.filter',
  'lodash.find',
  'lodash.findIndex',
  'lodash.some',
  'lodash.reject',
  'lodash-es.every',
  'lodash-es.filter',
  'lodash-es.find',
  'lodash-es.findIndex',
  'lodash-es.some',
  'lodash-es.reject',
  'underscore.every',
  'underscore.filter',
  'underscore.find',
  'underscore.findIndex',
  'underscore.some',
  'underscore.reject',
]);

/**
 * Checks if a node is an Identifier or MemberExpression (valid targets for lazy init checks).
 */
function isVariableNode(node: TSESTree.Node): boolean {
  return node.type === 'Identifier' || node.type === 'MemberExpression';
}

/**
 * Checks if the consequent block of an IfStatement contains an assignment
 * to the same variable as the one checked in the condition.
 */
function hasAssignmentInBody(
  ifStatement: TSESTree.IfStatement,
  variable: TSESTree.Node,
  sourceCode: Rule.RuleContext['sourceCode'],
): boolean {
  const consequent = ifStatement.consequent;
  const statements = consequent.type === 'BlockStatement' ? consequent.body : [consequent];

  for (const stmt of statements) {
    if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'AssignmentExpression' &&
      areEquivalent(stmt.expression.left, variable, sourceCode)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Detects the lazy initialization pattern: a Promise-typed variable is checked
 * in a conditional and assigned within the if-body.
 * Example: if (!cached) { cached = fetch(...); }
 */
function isLazyInitPattern(
  node: TSESTree.Node,
  sourceCode: Rule.RuleContext['sourceCode'],
): boolean {
  if (!isVariableNode(node)) {
    return false;
  }
  const ifStatement = findFirstMatchingLocalAncestor(node, n => n.type === 'IfStatement') as
    TSESTree.IfStatement | undefined;
  if (!ifStatement) {
    return false;
  }
  return hasAssignmentInBody(ifStatement, node, sourceCode);
}

function createLibraryPredicateListener(context: Rule.RuleContext): Rule.RuleListener {
  return {
    CallExpression: (node: estree.CallExpression) => {
      if (!isSupportedLibraryPredicateCall(context, node)) {
        return;
      }
      const predicateArgument = node.arguments[1];
      if (predicateArgument === undefined) {
        return;
      }
      const predicate = resolveAsyncPredicate(context, predicateArgument);
      if (predicate === null) {
        return;
      }
      const predicateStart = predicateArgument.range?.[0];
      if (predicateStart !== undefined) {
        if (flaggedNodeStarts.get(predicateStart)) {
          return;
        }
        flaggedNodeStarts.set(predicateStart, true);
      }
      if (predicateArgument.type === 'Identifier') {
        context.report({ node: predicateArgument, messageId: 'libraryPredicate' });
      } else {
        context.report({
          loc: getMainFunctionTokenLocation(
            predicate as unknown as TSESTree.FunctionLike,
            (predicate as unknown as TSESTree.FunctionLike).parent,
            context as unknown as RuleContext,
          ),
          messageId: 'libraryPredicate',
        });
      }
    },
  };
}

function isSupportedLibraryPredicateCall(
  context: Rule.RuleContext,
  call: estree.CallExpression,
): boolean {
  const methodName = getSyntacticMethodName(call.callee);
  if (methodName === undefined || !isDirectCallee(context, call.callee)) {
    return false;
  }
  const fqn = getFullyQualifiedName(context, call)?.replaceAll('/', '.');
  return fqn !== null && fqn !== undefined && SUPPORTED_LIBRARY_PREDICATES.has(fqn);
}

function getSyntacticMethodName(
  callee: estree.Expression | estree.Super,
): string | null | undefined {
  if (callee.type === 'MemberExpression') {
    if (callee.computed || !isIdentifier(callee.property)) {
      return undefined;
    }
    if (callee.object.type === 'CallExpression' && !isRequire(callee.object)) {
      return undefined;
    }
    return callee.property.name;
  }
  if (callee.type === 'Identifier') {
    return null;
  }
  return undefined;
}

function isDirectCallee(
  context: Rule.RuleContext,
  callee: estree.Expression | estree.Super,
): boolean {
  if (callee.type === 'MemberExpression') {
    return !callee.computed && isDirectReceiver(context, callee.object);
  }
  if (callee.type !== 'Identifier') {
    return false;
  }
  const variable = getVariableFromName(context, callee.name, callee);
  const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
  if (definition?.type === 'ImportBinding') {
    return true;
  }
  if (definition?.type !== 'Variable') {
    return false;
  }
  return isDirectRequireReference(context, definition.node.init);
}

function isDirectReceiver(
  context: Rule.RuleContext,
  receiver: estree.Expression | estree.Super,
): boolean {
  if (receiver.type === 'CallExpression') {
    return isRequire(receiver) && isUnshadowedRequire(context, receiver);
  }
  if (receiver.type !== 'Identifier') {
    return false;
  }
  const variable = getVariableFromName(context, receiver.name, receiver);
  const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
  if (definition?.type === 'ImportBinding') {
    return true;
  }
  return definition?.type === 'Variable' && isDirectRequireReference(context, definition.node.init);
}

function isDirectRequireReference(
  context: Rule.RuleContext,
  initializer: estree.Expression | null | undefined,
): boolean {
  const requireCall = getRequireCall(initializer);
  return requireCall !== null && isUnshadowedRequire(context, requireCall);
}

function getRequireCall(
  initializer: estree.Expression | null | undefined,
): estree.CallExpression | null {
  if (initializer === null || initializer === undefined) {
    return null;
  }
  if (isRequire(initializer)) {
    return initializer;
  }
  if (initializer.type === 'MemberExpression' && isRequire(initializer.object)) {
    return initializer.object;
  }
  return null;
}

function isUnshadowedRequire(
  context: Rule.RuleContext,
  requireCall: estree.CallExpression,
): boolean {
  const variable = getVariableFromName(context, 'require', requireCall);
  return variable === undefined || variable.defs.length === 0;
}

function resolveAsyncPredicate(
  context: Rule.RuleContext,
  argument: estree.CallExpression['arguments'][number] | undefined,
): FunctionNodeType | null {
  if (argument === undefined || argument.type === 'SpreadElement') {
    return null;
  }
  const functionNode =
    resolveFunction(context, argument) ??
    getValueOfExpression(context, argument, 'ArrowFunctionExpression', true) ??
    getValueOfExpression(context, argument, 'FunctionExpression', true);
  return functionNode?.async === true ? functionNode : null;
}

const noMisusedPromisesRule = tsEslintRules['no-misused-promises'];
const decoratedNoMisusedPromisesRule = interceptReport(
  noMisusedPromisesRule,
  (context, descriptor) => {
    if ('node' in descriptor) {
      const node = descriptor.node as TSESTree.Node;
      if (
        'messageId' in descriptor &&
        descriptor.messageId === 'conditional' &&
        isLazyInitPattern(node, context.sourceCode)
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
    } else if ('loc' in descriptor) {
      const start =
        'line' in descriptor.loc
          ? context.sourceCode.getIndexFromLoc(descriptor.loc)
          : descriptor.loc.start;
      if (!flaggedNodeStarts.get(start)) {
        flaggedNodeStarts.set(start, true);
        context.report(descriptor);
      }
    }
  },
);

const MISSING_PARENT_ERROR = 'Non-null Assertion Failed: Expected node to have a parent.';
type ReturnStatementListener = NonNullable<Rule.RuleListener['ReturnStatement']>;

function isMissingParentError(error: unknown): boolean {
  return error instanceof Error && error.message === MISSING_PARENT_ERROR;
}

export function guardNoMisusedPromisesReturnListener(
  listeners: Rule.RuleListener,
): Rule.RuleListener {
  const onReturnStatement = listeners.ReturnStatement;
  if (!onReturnStatement) {
    return listeners;
  }

  return {
    ...listeners,
    ReturnStatement: (...args: Parameters<ReturnStatementListener>) => {
      try {
        onReturnStatement(...args);
      } catch (error) {
        // `no-misused-promises` walks parent links from `ReturnStatement` nodes and can
        // throw on malformed parent chains from some JS/CommonJS inputs. Dropping that
        // single callback preserves the rest of the rule and avoids aborting file analysis.
        if (isMissingParentError(error)) {
          return;
        }
        throw error;
      }
    },
  };
}

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
      libraryPredicate: LIBRARY_PREDICATE_MESSAGE,
    },
    schema: [
      {
        type: 'object',
        properties: {},
      },
    ],
  }),
  create(context: Rule.RuleContext) {
    const noMisusedPromisesListeners = guardNoMisusedPromisesReturnListener(
      decoratedNoMisusedPromisesRule.create(context),
    );

    return {
      'Program:exit': () => {
        flaggedNodeStarts.clear();
      },
      ...mergeRules(
        decoratedNoAsyncPromiseExecutorRule.create(context),
        noMisusedPromisesListeners,
        createLibraryPredicateListener(context),
      ),
    };
  },
};
