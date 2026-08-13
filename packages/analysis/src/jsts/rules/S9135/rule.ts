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
import {
  FUNCTION_NODES,
  getUniqueWriteReference,
  getVariableFromName,
  isIdentifier,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import { getParent } from '../helpers/ancestor.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const LODASH_MESSAGE =
  'Mutating a nested property of this shallow clone changes the original value; use structuredClone() or _.cloneDeep() when isolation is required.';
const UNDERSCORE_MESSAGE =
  'Mutating a nested property of this shallow clone changes the original value; use structuredClone() when isolation is required.';
const SECONDARY_MESSAGE = 'Shallow clone created here.';
const NOSONAR_COMMENT = ' // NOSONAR: shared nested state is intentional';

const CLONE_LIBRARIES = new Map<string, 'lodash' | 'underscore'>([
  ['lodash.clone', 'lodash'],
  ['lodash-es.clone', 'lodash'],
  ['underscore.clone', 'underscore'],
]);

type MutationNode = estree.AssignmentExpression | estree.UpdateExpression | estree.UnaryExpression;

type IsolationKind = 'deep' | 'shallow';
type PrefixIsolation = IsolationKind | null | undefined;

type StaticMemberChain = {
  root: estree.Identifier;
  depth: number;
};

const DEEP_CLONE_FQNS = new Set(['lodash.cloneDeep', 'lodash-es.cloneDeep']);
const SHALLOW_CLONE_FQNS = new Set(['lodash.clone', 'lodash-es.clone', 'underscore.clone']);

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
  if (statement === undefined) {
    return;
  }

  const memberChain = getStaticMemberChain(mutatedNode);
  if (memberChain === undefined) {
    return;
  }

  const cloneCall = getCloneCall(context, memberChain.root);
  if (cloneCall === undefined) {
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

  if (hasIsolatingPrefixAssignment(context, mutatedNode, mutation)) {
    return;
  }

  const nosonarFix = getNosonarFix(context, statement, mutation);
  report(
    context,
    {
      node: mutation,
      message: library === 'underscore' ? UNDERSCORE_MESSAGE : LODASH_MESSAGE,
      suggest: [
        {
          desc: 'Replace the shallow clone with structuredClone()',
          fix: replaceWithStructuredClone(cloneCall, argument, context),
        },
        ...(nosonarFix === undefined
          ? []
          : [
              {
                desc: 'Add // NOSONAR: shared nested state is intentional',
                fix: nosonarFix,
              },
            ]),
      ],
    },
    [toSecondaryLocation(cloneCall, SECONDARY_MESSAGE)],
  );
}

function getMutationStatement(
  context: Rule.RuleContext,
  node: MutationNode,
): estree.Node | undefined {
  let parent = getParent(context, node);
  while (parent !== undefined) {
    if (parent.type.endsWith('Statement') || parent.type === 'VariableDeclaration') {
      return parent;
    }
    parent = getParent(context, parent);
  }
  return undefined;
}

function getStaticMemberChain(node: estree.Node): StaticMemberChain | undefined {
  let current: estree.Node = unwrapTypeScriptExpression(node);
  let depth = 0;

  while (current.type === 'MemberExpression') {
    if (!isStaticMember(current)) {
      return undefined;
    }
    depth += 1;
    current = unwrapTypeScriptExpression(current.object);
  }

  return current.type === 'Identifier' && depth >= 2 ? { root: current, depth } : undefined;
}

function isStaticMember(member: estree.MemberExpression): boolean {
  if (!member.computed) {
    return member.property.type === 'Identifier';
  }
  return (
    member.property.type === 'Literal' &&
    (typeof member.property.value === 'string' || typeof member.property.value === 'number')
  );
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

function replaceWithStructuredClone(
  cloneCall: estree.CallExpression,
  argument: estree.Node,
  context: Rule.RuleContext,
): Rule.ReportFixer {
  const argumentText = context.sourceCode.getText(argument);
  return (fixer: Rule.RuleFixer): Rule.Fix =>
    fixer.replaceText(cloneCall, `structuredClone(${argumentText})`);
}

function getNosonarFix(
  context: Rule.RuleContext,
  statement: estree.Node,
  mutation: MutationNode,
): Rule.ReportFixer | undefined {
  if (
    statement.loc?.start.line !== mutation.loc?.start.line ||
    statement.loc?.end.line !== mutation.loc?.start.line ||
    !hasNoTokensAfter(context, statement)
  ) {
    return undefined;
  }
  return (fixer: Rule.RuleFixer): Rule.Fix => fixer.insertTextAfter(statement, NOSONAR_COMMENT);
}

function hasNoTokensAfter(context: Rule.RuleContext, node: estree.Node): boolean {
  const range = node.range;
  if (range === undefined) {
    return false;
  }
  const source = context.sourceCode.getText();
  const lineEnd = source.indexOf('\n', range[1]);
  return source.slice(range[1], lineEnd === -1 ? source.length : lineEnd).trim() === '';
}

function hasIsolatingPrefixAssignment(
  context: Rule.RuleContext,
  mutatedNode: estree.Node,
  mutation: MutationNode,
): boolean {
  const target = unwrapTypeScriptExpression(mutatedNode);
  if (target.type !== 'MemberExpression') {
    return false;
  }

  let extraDepth = 1;
  let prefix: estree.Node = unwrapTypeScriptExpression(target.object);

  while (prefix.type === 'MemberExpression') {
    const isolation = findDominatingIsolation(context, prefix, mutation);
    if (isolation === 'deep' || (isolation === 'shallow' && extraDepth === 1)) {
      return true;
    }
    extraDepth += 1;
    prefix = unwrapTypeScriptExpression(prefix.object);
  }

  return false;
}

function findDominatingIsolation(
  context: Rule.RuleContext,
  prefix: estree.Node,
  mutation: MutationNode,
): IsolationKind | undefined {
  let current: estree.Node | undefined = mutation;
  let latest: PrefixIsolation;

  while (current !== undefined) {
    const parent = getParent(context, current);
    if (parent === undefined || FUNCTION_NODES.includes(parent.type)) {
      break;
    }

    const candidate = getPriorIsolation(context, parent, current, prefix);
    if (latest === undefined && candidate !== undefined) {
      latest = candidate;
    }

    if (latest === 'deep') {
      return 'deep';
    }
    current = parent;
  }

  return latest === null ? undefined : latest;
}

function getPriorIsolation(
  context: Rule.RuleContext,
  parent: estree.Node,
  current: estree.Node,
  prefix: estree.Node,
): PrefixIsolation {
  if (parent.type === 'SequenceExpression') {
    const index = parent.expressions.indexOf(current as estree.Expression);
    return index > 0
      ? isolationInNodes(parent.expressions.slice(0, index), prefix, context)
      : undefined;
  }

  const statements = getBlockStatements(parent);
  if (statements === undefined) {
    return undefined;
  }
  const index = statements.indexOf(current);
  return index > 0 ? isolationInStatements(statements.slice(0, index), prefix, context) : undefined;
}

function getBlockStatements(node: estree.Node): estree.Node[] | undefined {
  if (node.type === 'BlockStatement' || node.type === 'Program') {
    return node.body;
  }
  if (node.type === 'SwitchCase') {
    return node.consequent;
  }
  return undefined;
}

function isolationInStatements(
  statements: estree.Node[],
  prefix: estree.Node,
  context: Rule.RuleContext,
): PrefixIsolation {
  let latest: PrefixIsolation;
  for (const statement of statements) {
    const candidate = statementAssignsPrefix(statement, prefix, context);
    if (candidate !== undefined) {
      latest = candidate;
    }
  }
  return latest;
}

function isolationInNodes(
  nodes: estree.Node[],
  prefix: estree.Node,
  context: Rule.RuleContext,
): PrefixIsolation {
  let latest: PrefixIsolation;
  for (const node of nodes) {
    const candidate = expressionAssignsPrefix(node, prefix, context);
    if (candidate !== undefined) {
      latest = candidate;
    }
  }
  return latest;
}

function statementAssignsPrefix(
  statement: estree.Node,
  prefix: estree.Node,
  context: Rule.RuleContext,
): PrefixIsolation {
  if (statement.type === 'ExpressionStatement') {
    return expressionAssignsPrefix(statement.expression, prefix, context);
  }
  if (statement.type === 'BlockStatement') {
    return isolationInStatements(statement.body, prefix, context);
  }
  return undefined;
}

function expressionAssignsPrefix(
  expression: estree.Node,
  prefix: estree.Node,
  context: Rule.RuleContext,
): PrefixIsolation {
  const value = unwrapTypeScriptExpression(expression);
  if (value.type === 'SequenceExpression') {
    return isolationInNodes(value.expressions, prefix, context);
  }
  if (value.type !== 'AssignmentExpression') {
    return undefined;
  }
  if (!isSameBoundMember(value.left, prefix, context)) {
    return undefined;
  }
  if (value.operator !== '=') {
    return null;
  }
  return getFreshObjectIsolation(context, value.right) ?? null;
}

function isSameBoundMember(
  assignmentLeft: estree.Node,
  prefix: estree.Node,
  context: Rule.RuleContext,
): boolean {
  const left = unwrapTypeScriptExpression(assignmentLeft);
  const target = unwrapTypeScriptExpression(prefix);
  if (!areEquivalent(left, target, context.sourceCode)) {
    return false;
  }
  const leftRoot = getStaticRootIdentifier(left);
  const prefixRoot = getStaticRootIdentifier(target);
  if (leftRoot === undefined || prefixRoot === undefined) {
    return false;
  }
  const leftVariable = getVariableFromName(context, leftRoot.name, leftRoot);
  const prefixVariable = getVariableFromName(context, prefixRoot.name, prefixRoot);
  return leftVariable !== undefined && leftVariable === prefixVariable;
}

function getStaticRootIdentifier(node: estree.Node): estree.Identifier | undefined {
  let current: estree.Node = unwrapTypeScriptExpression(node);
  while (current.type === 'MemberExpression') {
    current = unwrapTypeScriptExpression(current.object);
  }
  return current.type === 'Identifier' ? current : undefined;
}

function getFreshObjectIsolation(
  context: Rule.RuleContext,
  rhs: estree.Node,
): IsolationKind | undefined {
  const value = unwrapTypeScriptExpression(rhs);
  if (value.type === 'ObjectExpression' || value.type === 'ArrayExpression') {
    return 'shallow';
  }
  if (value.type !== 'CallExpression') {
    return undefined;
  }
  if (isIdentifier(value.callee, 'structuredClone')) {
    return 'deep';
  }
  const fqn = getFullyQualifiedName(context, value.callee) ?? '';
  if (DEEP_CLONE_FQNS.has(fqn)) {
    return 'deep';
  }
  if (SHALLOW_CLONE_FQNS.has(fqn)) {
    return 'shallow';
  }
  return undefined;
}
