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
// https://sonarsource.github.io/rspec/#/rspec/S7766/javascript

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import {
  getUniqueWriteReference,
  getVariableFromScope,
  hasParent,
  isCallingMethod,
  isFunctionNode,
  isThisExpression,
} from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { getTypeFromTreeNode, isArrayLikeType, isNumberType } from '../helpers/type.js';
import * as meta from './generated-meta.js';

const comparisonOperators = new Set(['<', '<=', '>', '>=']);

type MinMaxConditionalExpression = estree.ConditionalExpression & {
  test: estree.BinaryExpression;
};

type TypedMinMaxEvidence = 'report' | 'suppress' | 'unknown';

/**
 * Decorates Unicorn's prefer-math-min-max rule with SonarJS false-positive escapes.
 *
 * The decorator only filters reports that already match the upstream min/max
 * ternary pattern. Those reports are forwarded unless:
 * 1. The type of the whole ternary proves the result is not a plain numeric value.
 * 2. The typed path cannot decide and the compared values can be traced to
 *    `this` or to direct object expressions such as `new Date(...)`.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (!isMinMaxConditionalReport(descriptor, context.sourceCode)) {
        context.report(descriptor);
        return;
      }

      if (shouldSuppressReport(descriptor.node, context.sourceCode)) {
        return;
      }

      context.report(descriptor);
    },
  );
}

/**
 * Decides whether a ternary already matched as a min/max pattern should be suppressed.
 *
 * The decision order mirrors the implementation:
 * 1. Use the type of the full conditional expression when available.
 * 2. Use the object fallback only when typing is unavailable or inconclusive.
 */
function shouldSuppressReport(node: MinMaxConditionalExpression, sourceCode: SourceCode): boolean {
  const typedEvidence = getTypedMinMaxEvidence(node, sourceCode);
  if (typedEvidence !== 'unknown') {
    return typedEvidence === 'suppress';
  }

  return hasDirectObjectSelectionEvidence(node, sourceCode);
}

/**
 * Classifies the full ternary expression using TypeScript type information.
 *
 * This reads the type of `left < right ? left : right` as a whole, not the types
 * of `left` and `right` separately. That matters for contextually typed callbacks:
 *
 * Pseudo-code:
 *   const pick: (x: T, y: T) => T = (x, y) => x > y ? x : y
 *
 * The conditional expression is typed as `T`, so the report is suppressed.
 */
function getTypedMinMaxEvidence(
  node: MinMaxConditionalExpression,
  sourceCode: SourceCode,
): TypedMinMaxEvidence {
  if (!isRequiredParserServices(sourceCode.parserServices)) {
    return 'unknown';
  }

  return classifyMinMaxType(getTypeFromTreeNode(node, sourceCode.parserServices));
}

/**
 * Converts a TypeScript type into a reporting decision.
 *
 * Decision rules:
 * 1. Union: return `unknown` if any branch is unknown, `report` if any branch
 *    is numeric, otherwise `suppress`.
 * 2. `any` / `unknown`: return `unknown` so the syntax fallback can decide.
 * 3. Type parameters and intersections: return `suppress`.
 * 4. Plain numeric types: return `report`.
 * 5. Every other type: return `suppress`.
 */
function classifyMinMaxType(type: ts.Type): TypedMinMaxEvidence {
  if (type.isUnion()) {
    let sawSuppressibleType = false;

    for (const constituent of type.types) {
      const evidence = classifyMinMaxType(constituent);
      if (evidence === 'unknown') {
        return 'unknown';
      }
      if (evidence === 'report') {
        return 'report';
      }
      sawSuppressibleType ||= evidence === 'suppress';
    }

    return sawSuppressibleType ? 'suppress' : 'report';
  }

  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
    return 'unknown';
  }

  if (
    (type.flags & ts.TypeFlags.TypeParameter) !== 0 ||
    (type.flags & ts.TypeFlags.Intersection) !== 0
  ) {
    return 'suppress';
  }

  return isNumberType(type) ? 'report' : 'suppress';
}

/**
 * Matches the conditional expressions that the upstream rule treats as
 * `Math.min(...)` or `Math.max(...)` candidates.
 *
 * Pseudo-code:
 *   left < right ? left : right
 *   left <= right ? left : right
 *   left > right ? left : right
 *   left >= right ? left : right
 *   left < right ? right : left
 *   left <= right ? right : left
 *   left > right ? right : left
 *   left >= right ? right : left
 */
function isMinMaxConditionalReport(
  descriptor: Rule.ReportDescriptor,
  sourceCode: SourceCode,
): descriptor is Rule.ReportDescriptor & { node: MinMaxConditionalExpression } {
  if (!('node' in descriptor) || descriptor.node.type !== 'ConditionalExpression') {
    return false;
  }

  const { test, consequent, alternate } = descriptor.node;
  return (
    test.type === 'BinaryExpression' &&
    comparisonOperators.has(test.operator) &&
    ((areEquivalent(test.left, consequent, sourceCode) &&
      areEquivalent(test.right, alternate, sourceCode)) ||
      (areEquivalent(test.left, alternate, sourceCode) &&
        areEquivalent(test.right, consequent, sourceCode)))
  );
}

/**
 * Checks whether either compared operand has direct-object evidence for the fallback.
 *
 * Pseudo-code:
 *   left < right ? left : right
 *   ^ inspect `left`
 *           ^ inspect `right`
 *
 * This fallback runs only when the typed path returns `unknown`.
 */
function hasDirectObjectSelectionEvidence(
  node: MinMaxConditionalExpression,
  sourceCode: SourceCode,
): boolean {
  const { left, right } = node.test;
  return (
    hasDirectObjectEvidence(left, sourceCode, new Set()) ||
    hasDirectObjectEvidence(right, sourceCode, new Set())
  );
}

/**
 * Resolves an expression to determine whether it should count as direct object
 * evidence for the fallback.
 *
 * Pseudo-code:
 *   this
 *   new Date(1)
 *   a            where const a = new Date(1)
 *   left         where every direct call passes a direct object to `left`
 *
 * `this` is accepted immediately. Identifiers are resolved recursively and the
 * search stops when it cannot prove the origin of the value.
 */
function hasDirectObjectEvidence(
  node: estree.Node,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  if (isThisExpression(node) || isDirectObjectExpression(node)) {
    return true;
  }

  if (node.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromScope(sourceCode.getScope(node), node.name);
  if (!variable || visitedVariables.has(variable)) {
    return false;
  }
  visitedVariables.add(variable);

  return variable.defs.some(definition =>
    hasDirectObjectDefinition(definition, variable, sourceCode, visitedVariables),
  );
}

/**
 * Follows the supported definition kinds for an identifier while looking for
 * direct-object evidence.
 *
 * Parameters are resolved through their direct call sites, while variables are
 * resolved through their initializer. All other definition kinds stop the search
 * and return `false`.
 */
function hasDirectObjectDefinition(
  definition: Scope.Definition,
  variable: Scope.Variable,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  switch (definition.type) {
    case 'Parameter':
      return (
        !variable.references.some(reference => reference.isWrite()) &&
        (hasReduceCallbackParameterEvidence(definition, sourceCode, visitedVariables) ||
          hasDirectObjectCallSites(definition, sourceCode))
      );
    case 'Variable': {
      const initializer = definition.node.init;
      return (
        initializer != null &&
        getUniqueWriteReference(variable) === initializer &&
        hasDirectObjectEvidence(initializer, sourceCode, visitedVariables)
      );
    }
    default:
      return false;
  }
}

function hasReduceCallbackParameterEvidence(
  definition: Scope.Definition,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  if (definition.name.type !== 'Identifier' || !isFunctionNode(definition.node)) {
    return false;
  }

  const parameterIndex = definition.node.params.indexOf(definition.name);
  if (parameterIndex !== 0 && parameterIndex !== 1) {
    return false;
  }

  const reduceCall = getInlineReduceCall(definition.node);
  if (!reduceCall || reduceCall.callee.object.type === 'Super') {
    return false;
  }

  const receiver = reduceCall.callee.object;
  if (!hasArrayReceiverEvidence(receiver, sourceCode, new Set())) {
    return false;
  }

  return hasReduceObjectValueEvidence(
    parameterIndex,
    reduceCall,
    receiver,
    sourceCode,
    visitedVariables,
  );
}

function hasReduceObjectValueEvidence(
  parameterIndex: number,
  reduceCall: estree.CallExpression,
  receiver: estree.Expression,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  if (parameterIndex === 1) {
    return hasArrayElementObjectEvidence(receiver, sourceCode, visitedVariables, new Set());
  }

  const initialValue = reduceCall.arguments[1];
  return (
    initialValue != null &&
    initialValue.type !== 'SpreadElement' &&
    hasDirectObjectEvidence(initialValue, sourceCode, new Set(visitedVariables))
  );
}

function getInlineReduceCall(functionNode: estree.Function):
  | (estree.CallExpression & {
      callee: estree.MemberExpression & { property: estree.Identifier };
    })
  | null {
  if (!hasParent(functionNode)) {
    return null;
  }

  const parent = functionNode.parent;
  if (
    parent.type === 'CallExpression' &&
    parent.arguments[0] === functionNode &&
    isCallingMethod(parent, 2, 'reduce')
  ) {
    return parent;
  }

  return null;
}

function hasArrayReceiverEvidence(
  node: estree.Expression,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  if (node.type === 'ArrayExpression') {
    return true;
  }

  if (isRequiredParserServices(sourceCode.parserServices)) {
    const type = getTypeFromTreeNode(node, sourceCode.parserServices);
    if (isArrayLikeType(type, sourceCode.parserServices)) {
      return true;
    }
  }

  if (node.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromScope(sourceCode.getScope(node), node.name);
  if (!variable || visitedVariables.has(variable)) {
    return false;
  }
  visitedVariables.add(variable);

  return variable.defs.some(definition =>
    hasArrayDefinitionEvidence(definition, variable, sourceCode),
  );
}

function hasArrayDefinitionEvidence(
  definition: Scope.Definition,
  variable: Scope.Variable,
  sourceCode: SourceCode,
): boolean {
  switch (definition.type) {
    case 'Variable': {
      const initializer = definition.node.init;
      return (
        initializer?.type === 'ArrayExpression' && getUniqueWriteReference(variable) === initializer
      );
    }
    case 'Parameter':
      return hasDirectArrayCallSites(definition, sourceCode);
    default:
      return false;
  }
}

function hasDirectArrayCallSites(definition: Scope.Definition, sourceCode: SourceCode): boolean {
  if (definition.name.type !== 'Identifier' || !isFunctionNode(definition.node)) {
    return false;
  }

  const parameterIndex = definition.node.params.indexOf(definition.name);
  if (parameterIndex === -1) {
    return false;
  }

  const callSites = findDirectCallSites(definition.node, sourceCode);
  return (
    callSites !== null &&
    callSites.length > 0 &&
    callSites.every(callSite => callSite.arguments[parameterIndex]?.type === 'ArrayExpression')
  );
}

function hasArrayElementObjectEvidence(
  node: estree.Expression,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
  visitedArrayVariables: Set<Scope.Variable>,
): boolean {
  if (node.type === 'ArrayExpression') {
    return hasArrayLiteralObjectElements(node, sourceCode, visitedVariables);
  }

  if (node.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromScope(sourceCode.getScope(node), node.name);
  if (!variable || visitedArrayVariables.has(variable)) {
    return false;
  }
  visitedArrayVariables.add(variable);

  return variable.defs.some(definition =>
    hasArrayDefinitionElementEvidence(definition, variable, sourceCode, visitedVariables),
  );
}

function hasArrayDefinitionElementEvidence(
  definition: Scope.Definition,
  variable: Scope.Variable,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  switch (definition.type) {
    case 'Variable': {
      const initializer = definition.node.init;
      return (
        initializer?.type === 'ArrayExpression' &&
        getUniqueWriteReference(variable) === initializer &&
        hasArrayLiteralObjectElements(initializer, sourceCode, visitedVariables)
      );
    }
    case 'Parameter':
      return hasDirectArrayObjectCallSites(definition, sourceCode, visitedVariables);
    default:
      return false;
  }
}

function hasDirectArrayObjectCallSites(
  definition: Scope.Definition,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  if (definition.name.type !== 'Identifier' || !isFunctionNode(definition.node)) {
    return false;
  }

  const parameterIndex = definition.node.params.indexOf(definition.name);
  if (parameterIndex === -1) {
    return false;
  }

  const callSites = findDirectCallSites(definition.node, sourceCode);
  return (
    callSites !== null &&
    callSites.length > 0 &&
    callSites.every(callSite => {
      const argument = callSite.arguments[parameterIndex];
      return (
        argument?.type === 'ArrayExpression' &&
        hasArrayLiteralObjectElements(argument, sourceCode, visitedVariables)
      );
    })
  );
}

function hasArrayLiteralObjectElements(
  node: estree.ArrayExpression,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  return (
    node.elements.length > 0 &&
    node.elements.every(
      element =>
        element != null &&
        element.type !== 'SpreadElement' &&
        hasDirectObjectEvidence(element, sourceCode, new Set(visitedVariables)),
    )
  );
}

/**
 * Accepts a parameter only when every direct call passes a direct object at the
 * same argument position. No calls or mixed call shapes are treated as unproven.
 *
 * Pseudo-code:
 *   function pick(left, right) { return left < right ? left : right; }
 *   pick(new Date(1), new Date(2))
 */
function hasDirectObjectCallSites(definition: Scope.Definition, sourceCode: SourceCode): boolean {
  if (definition.name.type !== 'Identifier' || !isFunctionNode(definition.node)) {
    return false;
  }

  const parameterIndex = definition.node.params.indexOf(definition.name);
  if (parameterIndex === -1) {
    return false;
  }

  const callSites = findDirectCallSites(definition.node, sourceCode);
  return (
    callSites !== null &&
    callSites.length > 0 &&
    callSites.every(callSite => isDirectObjectArgument(callSite.arguments[parameterIndex]))
  );
}

/**
 * Collects the direct calls made through a function's own binding.
 *
 * Pseudo-code:
 *   const fn = ...
 *   fn(...)
 *
 * The function's own binding write is ignored for variable-bound functions.
 * Any other reference that is not used as the callee of a call makes the call
 * set unreliable, so the function returns `null` and the fallback stops.
 */
function findDirectCallSites(
  functionNode: estree.Function,
  sourceCode: SourceCode,
): estree.CallExpression[] | null {
  const variable = getFunctionVariable(functionNode, sourceCode);
  if (!variable) {
    return null;
  }

  const bindingIdentifier = getFunctionBindingIdentifier(functionNode);
  const calls: estree.CallExpression[] = [];
  for (const reference of variable.references) {
    if (
      bindingIdentifier != null &&
      reference.isWrite() &&
      reference.identifier === bindingIdentifier
    ) {
      continue;
    }

    const parent = hasParent(reference.identifier) ? reference.identifier.parent : null;
    if (parent?.type === 'CallExpression' && parent.callee === reference.identifier) {
      calls.push(parent);
      continue;
    }
    return null;
  }

  return calls;
}

function getFunctionBindingIdentifier(functionNode: estree.Function): estree.Identifier | null {
  if (functionNode.type === 'FunctionDeclaration' && functionNode.id) {
    return functionNode.id;
  }

  if (!hasParent(functionNode)) {
    return null;
  }

  const parent = functionNode.parent;
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id;
  }

  if (parent?.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    return parent.left;
  }

  return null;
}

/**
 * Resolves the variable that names a function when the function is declared,
 * assigned to a variable, or assigned to an identifier.
 *
 * Pseudo-code:
 *   function fn() {}
 *   const fn = () => {}
 *   fn = () => {}
 */
function getFunctionVariable(
  functionNode: estree.Function,
  sourceCode: SourceCode,
): Scope.Variable | undefined {
  if (functionNode.type === 'FunctionDeclaration' && functionNode.id) {
    return getVariableFromScope(sourceCode.getScope(functionNode.id), functionNode.id.name);
  }

  if (!hasParent(functionNode)) {
    return undefined;
  }

  const parent = functionNode.parent;
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return getVariableFromScope(sourceCode.getScope(parent.id), parent.id.name);
  }

  if (parent?.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    return getVariableFromScope(sourceCode.getScope(parent.left), parent.left.name);
  }

  return undefined;
}

/**
 * Checks whether an argument is a non-spread direct object expression.
 *
 * Spread arguments are rejected because they do not preserve the one-parameter
 * to one-argument proof that the fallback relies on.
 */
function isDirectObjectArgument(
  argument: estree.Expression | estree.SpreadElement | undefined,
): boolean {
  return (
    argument != null && argument.type !== 'SpreadElement' && isDirectObjectExpression(argument)
  );
}

/**
 * Matches the object expression shapes recognized by the fallback.
 *
 * Pseudo-code:
 *   new Date(...)
 *   { valueOf() { ... } }
 *   { valueOf: () => ... }
 *
 * The helper is intentionally narrow: only these two shapes count as direct
 * object evidence.
 */
function isDirectObjectExpression(node: estree.Node): boolean {
  return isDateConstruction(node) || isObjectLiteralWithValueOf(node);
}

/**
 * Matches `new Date(...)`.
 *
 * Pseudo-code:
 *   new Date(123)
 */
function isDateConstruction(node: estree.Node): node is estree.NewExpression {
  return (
    node.type === 'NewExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'Date'
  );
}

/**
 * Matches object literals that declare a `valueOf` property.
 *
 * Pseudo-code:
 *   { valueOf() { ... } }
 *   { valueOf: () => ... }
 *   { 'valueOf': fn }
 *
 * The check only looks for the property name; it does not validate the value.
 */
function isObjectLiteralWithValueOf(node: estree.Node): node is estree.ObjectExpression {
  return (
    node.type === 'ObjectExpression' &&
    node.properties.some(
      property =>
        property.type === 'Property' &&
        !property.computed &&
        ((property.key.type === 'Identifier' && property.key.name === 'valueOf') ||
          (property.key.type === 'Literal' && property.key.value === 'valueOf')),
    )
  );
}
