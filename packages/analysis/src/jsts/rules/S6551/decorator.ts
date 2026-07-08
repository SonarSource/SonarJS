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
// https://sonarsource.github.io/rspec/#/rspec/S6551/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isGenericType } from '../helpers/type.js';
import { childrenOf } from '../helpers/ancestor.js';
import { isCallingMethod, isFunctionNode, isIdentifier, isIfStatement } from '../helpers/ast.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const USEFUL_TO_STRING = 'always';
const DEFAULT_TO_STRING = 'will';
const POSSIBLE_DEFAULT_TO_STRING = 'may';
const DEFAULT_IGNORED_TYPE_NAMES = ['Error', 'RegExp', 'URL', 'URLSearchParams'];
type ToStringCertainty =
  typeof USEFUL_TO_STRING | typeof DEFAULT_TO_STRING | typeof POSSIBLE_DEFAULT_TO_STRING;

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor) {
        const services = context.sourceCode.parserServices;
        const node = reportDescriptor.node as TSESTree.Node;
        if (
          isGenericType(node, services) ||
          isGuardedDirectToStringCall(reportDescriptor, context)
        ) {
          // we skip
        } else {
          const redirectedReport = redirectKnownUtilityToStringReport(reportDescriptor, context);
          if (redirectedReport !== undefined) {
            context.report(redirectedReport);
          }
        }
      }
    },
  );
}

function redirectKnownUtilityToStringReport(
  reportDescriptor: Rule.ReportDescriptor,
  context: Rule.RuleContext,
): Rule.ReportDescriptor | undefined {
  if (
    !('node' in reportDescriptor) ||
    !('messageId' in reportDescriptor) ||
    reportDescriptor.messageId !== 'baseToString'
  ) {
    return reportDescriptor;
  }

  const argument = getKnownUtilityToStringArgument(reportDescriptor.node as TSESTree.Node, context);
  if (argument === undefined) {
    return reportDescriptor;
  }

  const certainty = getToStringCertainty(argument, context);
  if (certainty === USEFUL_TO_STRING) {
    return undefined;
  }

  return {
    ...reportDescriptor,
    node: argument as estree.Node,
    data: {
      ...('data' in reportDescriptor ? reportDescriptor.data : {}),
      name: context.sourceCode.getText(argument as estree.Node),
      certainty,
    },
  };
}

function getKnownUtilityToStringArgument(
  node: TSESTree.Node,
  context: Rule.RuleContext,
): TSESTree.Expression | undefined {
  const call = getContainingToStringCallExpression(node);
  if (
    call === undefined ||
    call.arguments.length !== 1 ||
    call.arguments[0].type === 'SpreadElement' ||
    getFullyQualifiedName(context, call as estree.CallExpression) !== 'lodash.toString'
  ) {
    return undefined;
  }

  return call.arguments[0];
}

function getContainingToStringCallExpression(
  node: TSESTree.Node,
): TSESTree.CallExpression | undefined {
  const parent = node.parent;
  if (
    parent?.type === 'MemberExpression' &&
    parent.object === node &&
    parent.property.type === 'Identifier' &&
    parent.property.name === 'toString' &&
    parent.parent?.type === 'CallExpression' &&
    parent.parent.callee === parent
  ) {
    return parent.parent;
  }
  return undefined;
}

function getToStringCertainty(node: TSESTree.Node, context: Rule.RuleContext): ToStringCertainty {
  const services = context.sourceCode.parserServices;
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node));
  return collectToStringCertainty(type, checker, getToStringOptions(context), new Set());
}

function getToStringOptions(context: Rule.RuleContext) {
  const option = context.options[0] as
    { ignoredTypeNames?: string[]; checkUnknown?: boolean } | undefined;
  return {
    checkUnknown: option?.checkUnknown ?? false,
    ignoredTypeNames: option?.ignoredTypeNames ?? DEFAULT_IGNORED_TYPE_NAMES,
  };
}

function collectToStringCertainty(
  type: ts.Type,
  checker: ts.TypeChecker,
  options: { ignoredTypeNames: string[]; checkUnknown: boolean },
  visited: Set<ts.Type>,
): ToStringCertainty {
  if (visited.has(type)) {
    return USEFUL_TO_STRING;
  }
  if (isTypeParameter(type)) {
    const constraint = type.getConstraint();
    if (constraint) {
      return collectToStringCertainty(constraint, checker, options, visited);
    }
    return options.checkUnknown ? POSSIBLE_DEFAULT_TO_STRING : USEFUL_TO_STRING;
  }
  if (isPrimitiveStringifiable(type) || isIgnoredType(type, options.ignoredTypeNames)) {
    return USEFUL_TO_STRING;
  }
  if (type.isIntersection()) {
    return collectIntersectionTypeCertainty(type, checker, options, visited);
  }
  if (type.isUnion()) {
    return collectUnionTypeCertainty(type, checker, options, visited);
  }
  if (checker.isTupleType(type)) {
    return collectTupleCertainty(
      type as ts.TypeReference,
      checker,
      options,
      new Set([...visited, type]),
    );
  }
  if (checker.isArrayType(type)) {
    return collectArrayCertainty(type, checker, options, new Set([...visited, type]));
  }
  switch (isToStringLikeFromObject(type, checker)) {
    case undefined:
      return options.checkUnknown && type.flags === ts.TypeFlags.Unknown
        ? POSSIBLE_DEFAULT_TO_STRING
        : USEFUL_TO_STRING;
    case true:
      return DEFAULT_TO_STRING;
    case false:
      return USEFUL_TO_STRING;
  }
}

function collectUnionTypeCertainty(
  type: ts.UnionType,
  checker: ts.TypeChecker,
  options: { ignoredTypeNames: string[]; checkUnknown: boolean },
  visited: Set<ts.Type>,
): ToStringCertainty {
  const certainties = type.types.map(subType =>
    collectToStringCertainty(subType, checker, options, visited),
  );
  if (certainties.every(certainty => certainty === DEFAULT_TO_STRING)) {
    return DEFAULT_TO_STRING;
  }
  if (certainties.every(certainty => certainty === USEFUL_TO_STRING)) {
    return USEFUL_TO_STRING;
  }
  return POSSIBLE_DEFAULT_TO_STRING;
}

function collectIntersectionTypeCertainty(
  type: ts.IntersectionType,
  checker: ts.TypeChecker,
  options: { ignoredTypeNames: string[]; checkUnknown: boolean },
  visited: Set<ts.Type>,
): ToStringCertainty {
  for (const subType of type.types) {
    if (collectToStringCertainty(subType, checker, options, visited) === USEFUL_TO_STRING) {
      return USEFUL_TO_STRING;
    }
  }
  return DEFAULT_TO_STRING;
}

function collectTupleCertainty(
  type: ts.TypeReference,
  checker: ts.TypeChecker,
  options: { ignoredTypeNames: string[]; checkUnknown: boolean },
  visited: Set<ts.Type>,
): ToStringCertainty {
  const certainties = checker
    .getTypeArguments(type)
    .map(subType => collectToStringCertainty(subType, checker, options, visited));
  if (certainties.some(certainty => certainty === DEFAULT_TO_STRING)) {
    return DEFAULT_TO_STRING;
  }
  if (certainties.some(certainty => certainty === POSSIBLE_DEFAULT_TO_STRING)) {
    return POSSIBLE_DEFAULT_TO_STRING;
  }
  return USEFUL_TO_STRING;
}

function collectArrayCertainty(
  type: ts.Type,
  checker: ts.TypeChecker,
  options: { ignoredTypeNames: string[]; checkUnknown: boolean },
  visited: Set<ts.Type>,
): ToStringCertainty {
  const elementType = type.getNumberIndexType();
  if (elementType === undefined) {
    return USEFUL_TO_STRING;
  }
  return collectToStringCertainty(elementType, checker, options, visited);
}

function isPrimitiveStringifiable(type: ts.Type) {
  return (
    (type.flags &
      (ts.TypeFlags.StringLike |
        ts.TypeFlags.NumberLike |
        ts.TypeFlags.BigIntLike |
        ts.TypeFlags.BooleanLike |
        ts.TypeFlags.ESSymbolLike |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Void)) !==
    0
  );
}

function isTypeParameter(type: ts.Type) {
  return (type.flags & ts.TypeFlags.TypeParameter) !== 0;
}

function isIgnoredType(type: ts.Type, ignoredTypeNames: string[]) {
  const name = type.aliasSymbol?.name ?? type.getSymbol()?.name;
  return name !== undefined && ignoredTypeNames.includes(name);
}

function isToStringLikeFromObject(type: ts.Type, checker: ts.TypeChecker): boolean | undefined {
  if (
    type
      .getProperties()
      .some(
        property =>
          property.valueDeclaration !== undefined &&
          isSymbolToPrimitiveMethod(property.valueDeclaration),
      )
  ) {
    return false;
  }

  let foundFallbackOnObject = false;
  for (const propertyName of ['toLocaleString', 'toString', 'valueOf']) {
    const candidate = checker.getPropertyOfType(type, propertyName);
    if (!candidate) {
      continue;
    }
    const declarations = candidate.getDeclarations();
    if (!declarations?.length) {
      continue;
    }
    if (
      declarations.some(
        declaration =>
          !(
            ts.isInterfaceDeclaration(declaration.parent) &&
            declaration.parent.name.text === 'Object'
          ),
      )
    ) {
      return false;
    }
    foundFallbackOnObject = true;
  }
  return foundFallbackOnObject ? true : undefined;
}

function isSymbolToPrimitiveMethod(node: ts.Declaration) {
  return (
    ts.isMethodSignature(node) &&
    ts.isComputedPropertyName(node.name) &&
    ts.isPropertyAccessExpression(node.name.expression) &&
    ts.isIdentifier(node.name.expression.expression) &&
    node.name.expression.expression.text === 'Symbol' &&
    ts.isIdentifier(node.name.expression.name) &&
    node.name.expression.name.text === 'toPrimitive'
  );
}

/**
 * Suppresses only direct `receiver.toString()` reports covered by one of two runtime defenses:
 * 1. the receiver is used in the first statement of a branch guarded by
 *    `receiver.toString !== Object.prototype.toString`;
 * 2. the call result is stored in a const and immediately used only in the branch that rejects
 *    the default `[object Object]` result.
 *
 * Other stringification forms and nearby-but-weaker shapes keep reporting.
 */
function isGuardedDirectToStringCall(
  reportDescriptor: Rule.ReportDescriptor,
  context: Rule.RuleContext,
): boolean {
  if (
    !('node' in reportDescriptor) ||
    !('messageId' in reportDescriptor) ||
    reportDescriptor.messageId !== 'baseToString'
  ) {
    return false;
  }

  const call = getReportedToStringCall(reportDescriptor.node as TSESTree.Node);
  return (
    call !== undefined &&
    (isGuardedReceiverCall(call, context) || isValidatedResultCall(call, context))
  );
}

function getReportedToStringCall(node: TSESTree.Node): TSESTree.CallExpression | undefined {
  if (
    node.type === 'CallExpression' &&
    isCallingMethod(node as estree.CallExpression, 0, 'toString')
  ) {
    return node;
  }
  if (
    node.type === 'MemberExpression' &&
    node.parent?.type === 'CallExpression' &&
    node.parent.callee === node &&
    isCallingMethod(node.parent as estree.CallExpression, 0, 'toString')
  ) {
    return node.parent;
  }

  const parent: TSESTree.Node | undefined = node.parent;
  if (
    parent?.type === 'MemberExpression' &&
    parent.object === node &&
    parent.parent?.type === 'CallExpression' &&
    parent.parent.callee === parent &&
    isCallingMethod(parent.parent as estree.CallExpression, 0, 'toString')
  ) {
    return parent.parent;
  }
  return undefined;
}

function isGuardedReceiverCall(call: TSESTree.CallExpression, context: Rule.RuleContext): boolean {
  const receiver = (call.callee as TSESTree.MemberExpression).object;
  if (!isStableReceiver(receiver)) {
    return false;
  }

  let current: TSESTree.Node | undefined = call;
  while (current?.parent) {
    const parent: TSESTree.Node = current.parent;
    if (isIfStatement(parent)) {
      if (
        parent.consequent === current &&
        isCallInFirstStatementOfBranch(call, parent.consequent) &&
        provesCustomToString(parent.test, receiver, context, true)
      ) {
        return true;
      }
      if (
        parent.alternate === current &&
        isCallInFirstStatementOfBranch(call, parent.alternate) &&
        provesCustomToString(parent.test, receiver, context, false)
      ) {
        return true;
      }
    }
    if (isFunctionNode(parent as estree.Node)) {
      break;
    }
    current = parent;
  }
  return false;
}

/**
 * Matches a guarded branch only when the reported call is reached before any sibling statement:
 *
 *   if (value.toString !== Object.prototype.toString) {
 *     return value.toString(); // match
 *   }
 *
 *   if (value.toString !== Object.prototype.toString) {
 *     mutate(value);
 *     return value.toString(); // non-match
 *   }
 */
function isCallInFirstStatementOfBranch(
  call: TSESTree.CallExpression,
  branch: TSESTree.Statement | null,
): boolean {
  if (!branch) {
    return false;
  }

  const firstStatement = branch.type === 'BlockStatement' ? branch.body[0] : branch;
  return firstStatement !== undefined && startsWithCall(firstStatement, call);
}

/**
 * Accepts only statement forms where the call itself is evaluated first.
 * `return value.toString()` matches; `return mutate(value) && value.toString()` does not.
 */
function startsWithCall(statement: TSESTree.Statement, call: TSESTree.CallExpression): boolean {
  if (statement.type === 'ReturnStatement') {
    return statement.argument === call;
  }

  if (statement.type === 'ExpressionStatement') {
    return statement.expression === call;
  }

  if (statement.type === 'VariableDeclaration' && statement.declarations.length === 1) {
    return statement.declarations[0].init === call;
  }

  return false;
}

/**
 * Recognizes the branch condition proving a custom implementation.
 *
 * Matches:
 *   value.toString !== Object.prototype.toString
 *   typeof value.toString === 'function' && value.toString !== Object.prototype.toString
 *
 * Non-matches:
 *   value.toString !== Object.prototype.toString || fallback
 *   value.toString !== Object.prototype.toString && hasSideEffect()
 */
function provesCustomToString(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  context: Rule.RuleContext,
  positiveBranch: boolean,
): boolean {
  if (condition.type === 'LogicalExpression' && condition.operator === '&&' && positiveBranch) {
    const conjuncts = flattenConjunction(condition);
    return (
      conjuncts.some(conjunct => provesCustomToString(conjunct, receiver, context, true)) &&
      conjuncts.every(
        conjunct =>
          provesCustomToString(conjunct, receiver, context, true) ||
          provesReceiverToStringIsFunction(conjunct, receiver, context) ||
          provesReceiverIsObjectLike(conjunct, receiver, context),
      )
    );
  }

  if (condition.type !== 'BinaryExpression') {
    return false;
  }

  const expectedOperator = positiveBranch ? '!==' : '===';
  return (
    condition.operator === expectedOperator &&
    ((isReceiverToString(condition.left, receiver, context) &&
      isObjectPrototypeToString(condition.right)) ||
      (isObjectPrototypeToString(condition.left) &&
        isReceiverToString(condition.right, receiver, context)))
  );
}

function flattenConjunction(condition: TSESTree.Expression): TSESTree.Expression[] {
  if (condition.type === 'LogicalExpression' && condition.operator === '&&') {
    return [...flattenConjunction(condition.left), ...flattenConjunction(condition.right)];
  }
  return [condition];
}

/**
 * Allows optional support conjuncts that only prove `receiver.toString` is callable.
 * They are not sufficient on their own because inherited `Object.prototype.toString` is callable too.
 */
function provesReceiverToStringIsFunction(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  context: Rule.RuleContext,
): boolean {
  return (
    condition.type === 'BinaryExpression' &&
    condition.operator === '===' &&
    ((condition.left.type === 'UnaryExpression' &&
      condition.left.operator === 'typeof' &&
      isReceiverToString(condition.left.argument, receiver, context) &&
      condition.right.type === 'Literal' &&
      condition.right.value === 'function') ||
      (condition.right.type === 'UnaryExpression' &&
        condition.right.operator === 'typeof' &&
        isReceiverToString(condition.right.argument, receiver, context) &&
        condition.left.type === 'Literal' &&
        condition.left.value === 'function'))
  );
}

/**
 * Allows optional support conjuncts that prove the receiver is object-like before reading
 * `receiver.toString`. These checks support the custom-toString comparison but never suppress alone.
 */
function provesReceiverIsObjectLike(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  context: Rule.RuleContext,
): boolean {
  return (
    condition.type === 'BinaryExpression' &&
    ((condition.operator === '===' &&
      ((condition.left.type === 'UnaryExpression' &&
        condition.left.operator === 'typeof' &&
        areEquivalent(condition.left.argument, receiver, context.sourceCode) &&
        condition.right.type === 'Literal' &&
        condition.right.value === 'object') ||
        (condition.right.type === 'UnaryExpression' &&
          condition.right.operator === 'typeof' &&
          areEquivalent(condition.right.argument, receiver, context.sourceCode) &&
          condition.left.type === 'Literal' &&
          condition.left.value === 'object'))) ||
      (condition.operator === '!==' &&
        ((areEquivalent(condition.left, receiver, context.sourceCode) &&
          condition.right.type === 'Literal' &&
          condition.right.value === null) ||
          (areEquivalent(condition.right, receiver, context.sourceCode) &&
            condition.left.type === 'Literal' &&
            condition.left.value === null))))
  );
}

/**
 * Matches immediate result validation only:
 *
 *   const result = value.toString();
 *   if (result !== '[object Object]') {
 *     return result; // match
 *   }
 *
 * The result must not be used after the validation or in the rejected branch.
 */
function isValidatedResultCall(call: TSESTree.CallExpression, context: Rule.RuleContext): boolean {
  const declarator: TSESTree.Node | undefined = call.parent;
  if (
    declarator?.type !== 'VariableDeclarator' ||
    declarator.init !== call ||
    declarator.id.type !== 'Identifier'
  ) {
    return false;
  }

  const resultName = declarator.id.name;
  const declaration: TSESTree.Node | undefined = declarator.parent;
  if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const') {
    return false;
  }

  const block: TSESTree.Node | undefined = declaration.parent;
  if (block?.type !== 'BlockStatement') {
    return false;
  }

  const declarationIndex = block.body.indexOf(declaration);
  const validation = block.body[declarationIndex + 1];
  if (
    !isIfStatement(validation) ||
    usesIdentifierAfter(block, declarationIndex + 1, resultName, context)
  ) {
    return false;
  }

  const acceptedBranch = provesAcceptedResult(validation.test, resultName, true)
    ? validation.consequent
    : undefined;
  const acceptedElseBranch = provesAcceptedResult(validation.test, resultName, false)
    ? validation.alternate
    : undefined;

  if (acceptedBranch) {
    return (
      usesIdentifier(acceptedBranch, resultName, context) &&
      !usesIdentifier(validation.alternate, resultName, context)
    );
  }
  return (
    acceptedElseBranch !== undefined &&
    usesIdentifier(acceptedElseBranch, resultName, context) &&
    !usesIdentifier(validation.consequent, resultName, context)
  );
}

/**
 * Recognizes the accepted branch of the default-string rejection:
 * `result !== '[object Object]'` accepts the consequent, while
 * `result === '[object Object]'` accepts the else branch.
 */
function provesAcceptedResult(
  condition: TSESTree.Expression,
  variableName: string,
  positiveBranch: boolean,
): boolean {
  if (condition.type !== 'BinaryExpression') {
    return false;
  }
  const expectedOperator = positiveBranch ? '!==' : '===';
  return (
    condition.operator === expectedOperator &&
    ((isIdentifier(condition.left, variableName) &&
      condition.right.type === 'Literal' &&
      condition.right.value === '[object Object]') ||
      (isIdentifier(condition.right, variableName) &&
        condition.left.type === 'Literal' &&
        condition.left.value === '[object Object]'))
  );
}

/**
 * Matches non-computed `.toString` reads on the same stable receiver expression.
 * `value.toString` matches for `value`; `value['toString']` and `other.toString` do not.
 */
function isReceiverToString(
  node: TSESTree.Node,
  receiver: TSESTree.Expression,
  context: Rule.RuleContext,
): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.property, 'toString') &&
    areEquivalent(node.object, receiver, context.sourceCode)
  );
}

/**
 * Matches exactly `Object.prototype.toString`, the default implementation the rule warns about.
 */
function isObjectPrototypeToString(node: TSESTree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.property, 'toString') &&
    node.object.type === 'MemberExpression' &&
    !node.object.computed &&
    isIdentifier(node.object.object, 'Object') &&
    isIdentifier(node.object.property, 'prototype')
  );
}

/**
 * Limits receiver-guard suppression to single-evaluation receivers.
 * `value` and `this` match; `holder.value` does not because it may invoke a getter on each access.
 */
function isStableReceiver(node: TSESTree.Node): boolean {
  return isIdentifier(node) || node.type === 'ThisExpression';
}

/**
 * Prevents suppressing when a validated result escapes after the guarding `if`.
 */
function usesIdentifierAfter(
  block: TSESTree.BlockStatement,
  statementIndex: number,
  variableName: string,
  context: Rule.RuleContext,
): boolean {
  return block.body
    .slice(statementIndex + 1)
    .some(statement => usesIdentifier(statement, variableName, context));
}

function usesIdentifier(
  node: TSESTree.Node | null | undefined,
  variableName: string,
  context: Rule.RuleContext,
): boolean {
  if (!node) {
    return false;
  }
  if (isIdentifier(node, variableName)) {
    return true;
  }
  return childrenOf(node as estree.Node, context.sourceCode.visitorKeys).some(child =>
    usesIdentifier(child as TSESTree.Node, variableName, context),
  );
}
