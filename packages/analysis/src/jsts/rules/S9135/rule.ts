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
// https://sonarsource.github.io/rspec/#/rspec/S9135/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { getUniqueWriteReference, getVariableFromName } from '../helpers/ast.js';
import { getParent } from '../helpers/ancestor.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const LODASH_MESSAGE =
  'Mutating a nested property of this _.clone() changes the original value; use structuredClone() or _.cloneDeep() when isolation is required.';
const UNDERSCORE_MESSAGE =
  'Mutating a nested property of this _.clone() changes the original value; use structuredClone() when isolation is required.';
const SECONDARY_MESSAGE = 'Shallow clone created here.';
const NOSONAR_COMMENT = ' // NOSONAR: shared nested state is intentional';

const CLONE_LIBRARIES = new Map<string, 'lodash' | 'underscore'>([
  ['lodash.clone', 'lodash'],
  ['lodash-es.clone', 'lodash'],
  ['underscore.clone', 'underscore'],
]);

const LOOP_TYPES = new Set([
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'WhileStatement',
]);

type MutationNode = estree.AssignmentExpression | estree.UpdateExpression | estree.UnaryExpression;

type StaticMemberChain = {
  root: estree.Identifier;
  depth: number;
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { hasSuggestions: true }),
  create(context: Rule.RuleContext) {
    return {
      AssignmentExpression: (node: estree.Node): void => {
        const assignment = node as estree.AssignmentExpression;
        checkMutation(context, assignment.left, assignment);
      },
      UpdateExpression: (node: estree.Node): void => {
        const update = node as estree.UpdateExpression;
        checkMutation(context, update.argument, update);
      },
      UnaryExpression: (node: estree.Node): void => {
        const unary = node as estree.UnaryExpression;
        if (unary.operator === 'delete') {
          checkMutation(context, unary.argument, unary);
        }
      },
    };
  },
};

function checkMutation(
  context: Rule.RuleContext,
  mutatedNode: estree.Node,
  mutation: MutationNode,
): void {
  const statement = getMutationStatement(context, mutation);
  if (statement === undefined || isInsideLoop(mutation)) {
    return;
  }

  const memberChain = getStaticMemberChain(mutatedNode);
  if (memberChain === undefined) {
    return;
  }

  const cloneCall = getCloneCall(context, memberChain.root);
  if (
    cloneCall === undefined ||
    isInsideLoop(cloneCall) ||
    getScopeBoundary(cloneCall) !== getScopeBoundary(mutation)
  ) {
    return;
  }

  const library = getCloneLibrary(context, cloneCall);
  if (library === undefined) {
    return;
  }

  const argument = cloneCall.arguments[0];
  if (argument === undefined || argument.type === 'SpreadElement') {
    return;
  }

  report(
    context,
    {
      node: statement,
      message: library === 'underscore' ? UNDERSCORE_MESSAGE : LODASH_MESSAGE,
      suggest: [
        {
          desc: 'Replace the shallow clone with structuredClone()',
          fix: replaceWithStructuredClone(cloneCall, argument, context),
        },
        {
          desc: 'Add // NOSONAR: shared nested state is intentional',
          fix: addNosonarComment(statement),
        },
      ],
    },
    [toSecondaryLocation(cloneCall, SECONDARY_MESSAGE)],
  );
}

function getMutationStatement(
  context: Rule.RuleContext,
  node: MutationNode,
): estree.ExpressionStatement | undefined {
  const parent = getParent(context, node);
  return parent?.type === 'ExpressionStatement' ? parent : undefined;
}

function getStaticMemberChain(node: estree.Node): StaticMemberChain | undefined {
  let current: estree.Node = node;
  let depth = 0;

  while (current.type === 'MemberExpression') {
    if (current.computed || current.property.type !== 'Identifier') {
      return undefined;
    }
    depth += 1;
    current = current.object;
  }

  return current.type === 'Identifier' && depth >= 2 ? { root: current, depth } : undefined;
}

function getCloneCall(
  context: Rule.RuleContext,
  root: estree.Identifier,
): estree.CallExpression | undefined {
  const variable = getVariableFromName(context, root.name, root);
  const writeExpression = getUniqueWriteReference(variable);
  if (writeExpression?.type !== 'CallExpression' || writeExpression.arguments.length !== 1) {
    return undefined;
  }
  return writeExpression;
}

function getCloneLibrary(
  context: Rule.RuleContext,
  cloneCall: estree.CallExpression,
): 'lodash' | 'underscore' | undefined {
  return CLONE_LIBRARIES.get(getFullyQualifiedName(context, cloneCall.callee) ?? '');
}

function isInsideLoop(node: estree.Node): boolean {
  let current = getNodeParent(node);
  while (current != null) {
    if (LOOP_TYPES.has(current.type)) {
      return true;
    }
    if (isFunctionLike(current)) {
      return false;
    }
    current = getNodeParent(current);
  }
  return false;
}

function getScopeBoundary(node: estree.Node): estree.Node {
  let current = node;
  while (getNodeParent(current) != null) {
    const parent = getNodeParent(current);
    if (parent.type === 'Program' || isFunctionLike(parent)) {
      return parent;
    }
    current = parent;
  }
  return current;
}

function isFunctionLike(
  node: estree.Node,
): node is estree.ArrowFunctionExpression | estree.FunctionDeclaration | estree.FunctionExpression {
  return (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression'
  );
}

function replaceWithStructuredClone(
  cloneCall: estree.CallExpression,
  argument: estree.Node,
  context: Rule.RuleContext,
): Rule.ReportFixer {
  const argumentText = context.sourceCode.getText(argument);
  return (fixer: Rule.RuleFixer): Rule.Fix =>
    fixer.replaceText(cloneCall, `structuredClone(${argumentText})`);
}

function addNosonarComment(statement: estree.ExpressionStatement): Rule.ReportFixer {
  return (fixer: Rule.RuleFixer): Rule.Fix => fixer.insertTextAfter(statement, NOSONAR_COMMENT);
}

function getNodeParent(node: estree.Node): estree.Node {
  return (node as estree.Node & { parent: estree.Node }).parent;
}
