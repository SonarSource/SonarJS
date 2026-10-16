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
import { ASTUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { Rule, Scope } from 'eslint';
import type { Node } from 'estree';
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import { getFirstConcreteRole } from '../helpers/accessibility.js';
import {
  getUniqueWriteUsageOrNode,
  getVariableFromName,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isJsxIdentifierNamed } from '../helpers/jsx.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import { isInHtmlNamespace, openingElementOf } from './helpers.js';
import * as meta from './generated-meta.js';

// These names can also identify SVG elements rendered through a component.
const SHARED_HTML_SVG_TAG_NAMES = new Set(['a', 'font', 'image', 'script', 'style', 'title']);

const ARIA_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
/**
 * Suppresses reports for proven editing hosts, focusable separators, and conditional values
 * that cannot add an element to sequential keyboard navigation.
 *
 * @example Pseudocode
 * report(<div contentEditable tabIndex={0} />.tabIndex) -> suppress
 * report(<div tabIndex={disabled ? null : -1} />.tabIndex) -> suppress
 * report(<div tabIndex={0} />.tabIndex) -> forward
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      if (isTabIndexOutsideSequentialFocusOrder(descriptor)) {
        return;
      }
      const opening = openingElementOf(descriptor);
      if (opening && (isEditableHtmlHost(opening) || isSeparatorWidget(context, opening))) {
        return;
      }
      context.report(descriptor);
    },
  );
}

/**
 * Identifies intrinsic div separators with a known role and current value.
 * @param context the rule context
 * @param opening the JSX opening element
 * @return whether the element declares a separator widget
 */
function isSeparatorWidget(
  context: Rule.RuleContext,
  opening: TSESTree.JSXOpeningElement,
): boolean {
  if (!isJsxIdentifierNamed(opening.name, 'div')) {
    return false;
  }
  const role = attributeExpression(effectiveAttribute(context, opening, 'role'));
  if (role?.type !== 'Literal' || typeof role.value !== 'string') {
    return false;
  }
  return (
    getFirstConcreteRole(role.value) === 'separator' &&
    hasCurrentValue(context, effectiveAttribute(context, opening, 'aria-valuenow'))
  );
}

/**
 * Finds an explicitly declared attribute that cannot be overridden by a spread.
 * Unlike getProp, this lookup respects the last declaration and later spreads.
 * @param context the rule context
 * @param opening the JSX opening element
 * @param name the attribute name
 * @return the effective attribute when it is known
 */
function effectiveAttribute(
  context: Rule.RuleContext,
  opening: TSESTree.JSXOpeningElement,
  name: string,
): TSESTree.JSXAttribute | undefined {
  for (let index = opening.attributes.length - 1; index >= 0; index--) {
    const attribute = opening.attributes[index];
    if (attribute.type === 'JSXSpreadAttribute') {
      if (canSpreadOverrideAttribute(context, attribute.argument, name)) {
        return undefined;
      }
      continue;
    }
    if (attribute.name.type === 'JSXIdentifier' && attribute.name.name === name) {
      return attribute;
    }
  }
  return undefined;
}

function canSpreadOverrideAttribute(
  context: Rule.RuleContext,
  argument: TSESTree.Node,
  name: string,
  seen = new Set<TSESTree.Node>(),
  memo = new Map<TSESTree.Node, boolean>(),
): boolean {
  const expression = unwrapTypeScriptExpression(argument);
  const cached = memo.get(expression);
  if (cached !== undefined) {
    return cached;
  }
  if (seen.has(expression)) {
    return true;
  }
  seen.add(expression);
  const result = canSpreadOverrideExpression(context, expression, name, seen, memo);
  seen.delete(expression);
  // Each traversal checks one attribute name, so cached results stay attribute-specific.
  memo.set(expression, result);
  return result;
}

function canSpreadOverrideExpression(
  context: Rule.RuleContext,
  expression: TSESTree.Node,
  name: string,
  seen: Set<TSESTree.Node>,
  memo: Map<TSESTree.Node, boolean>,
): boolean {
  if (expression.type === 'Identifier') {
    const variable = getVariableFromName(context, expression.name, expression as Node);
    // Other reads could mutate or pass the object to code that adds an attribute.
    if (!variable || variable.references.some(ref => ref.isRead() && !isSpreadReference(ref))) {
      return true;
    }
    const value = getSimpleBindingValue(context, expression);
    return value === expression || canSpreadOverrideAttribute(context, value, name, seen, memo);
  }
  if (expression.type !== 'ObjectExpression') {
    return true;
  }
  return expression.properties.some(property => {
    if (property.type === 'SpreadElement') {
      return canSpreadOverrideAttribute(context, property.argument, name, seen, memo);
    }
    if (!property.computed && property.key.type === 'Identifier') {
      return property.key.name === name;
    }
    const scope = context.sourceCode.getScope(
      property.key as Node,
    ) as unknown as TSESLint.Scope.Scope;
    const key = ASTUtils.getStaticValue(property.key, scope);
    return key === null || String(key.value) === name;
  });
}

function isSpreadReference(reference: Scope.Reference): boolean {
  let parent = (reference.identifier as TSESTree.Node).parent;
  while (parent && unwrapTypeScriptExpression(parent) !== parent) {
    parent = parent.parent;
  }
  return parent?.type === 'JSXSpreadAttribute' || parent?.type === 'SpreadElement';
}

/**
 * Extracts the expression supplied as an attribute value.
 * @param attribute the JSX attribute
 * @return the expression with TypeScript assertions removed
 */
function attributeExpression(
  attribute: TSESTree.JSXAttribute | undefined,
): TSESTree.Node | undefined {
  const value = attribute?.value;
  const expression = value?.type === 'JSXExpressionContainer' ? value.expression : value;
  return expression ? unwrapTypeScriptExpression(expression) : undefined;
}

/**
 * Accepts runtime current values while rejecting statically invalid values.
 * @param context the rule context
 * @param attribute the current-value attribute
 * @return whether a numeric current value is supplied or can be computed at runtime
 */
function hasCurrentValue(
  context: Rule.RuleContext,
  attribute: TSESTree.JSXAttribute | undefined,
): boolean {
  const expression = attributeExpression(attribute);
  if (!expression || expression.type === 'JSXEmptyExpression') {
    return false;
  }
  const scope = context.sourceCode.getScope(expression as Node) as unknown as TSESLint.Scope.Scope;
  const evaluated = ASTUtils.getStaticValue(expression, scope);
  if (evaluated === null) {
    return !isDefinitelyNonNumeric(context, expression);
  }
  return isNumericCurrentValue(evaluated.value);
}

function isNumericCurrentValue(value: unknown): boolean {
  return (
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && ARIA_NUMBER.test(value) && Number.isFinite(Number(value)))
  );
}

/**
 * Matches: <div tabIndex={disabled ? null : -1} />
 * Requires no spreads or later tabIndex attributes.
 */
function isTabIndexOutsideSequentialFocusOrder(reportDescriptor: Rule.ReportDescriptor): boolean {
  if (!('node' in reportDescriptor) || reportDescriptor.node.type !== 'JSXAttribute') {
    return false;
  }

  const node = reportDescriptor.node as TSESTree.JSXAttribute;
  return (
    node.name.type === 'JSXIdentifier' &&
    node.name.name === 'tabIndex' &&
    node.value?.type === 'JSXExpressionContainer' &&
    node.value.expression.type === 'ConditionalExpression' &&
    hasNoTabIndexOverrides(node) &&
    isNonSequentialTabIndexValue(node.value.expression)
  );
}

/**
 * Matches: <div id="title" tabIndex={value} title="Title" />
 * Rejects any spread or later tabIndex attribute, including case variants.
 */
function hasNoTabIndexOverrides(node: TSESTree.JSXAttribute): boolean {
  const parent = node.parent;
  if (parent?.type !== 'JSXOpeningElement') {
    return false;
  }

  const index = parent.attributes.indexOf(node);
  // Spreads can add a differently cased DOM attribute, even before tabIndex.
  return (
    index !== -1 &&
    !parent.attributes.some(
      (attribute, attributeIndex) =>
        attribute.type === 'JSXSpreadAttribute' ||
        (attributeIndex > index &&
          attribute.name.type === 'JSXIdentifier' &&
          attribute.name.name.toLowerCase() === 'tabindex'),
    )
  );
}

/**
 * Matches:
 *   null
 *   -1
 *   condition ? null : nested ? -1 : -2
 * Every leaf must be null or a negative integer literal.
 */
function isNonSequentialTabIndexValue(expression: TSESTree.Expression): boolean {
  if (expression.type === 'ConditionalExpression') {
    return (
      isNonSequentialTabIndexValue(expression.consequent) &&
      isNonSequentialTabIndexValue(expression.alternate)
    );
  }

  if (expression.type === 'Literal' && expression.value === null) {
    return true;
  }

  return (
    expression.type === 'UnaryExpression' &&
    expression.operator === '-' &&
    expression.argument.type === 'Literal' &&
    typeof expression.argument.value === 'number' &&
    Number.isInteger(expression.argument.value) &&
    expression.argument.value > 0
  );
}

function isDefinitelyNonNumeric(
  context: Rule.RuleContext,
  expression: TSESTree.Node,
  seen = new Set<TSESTree.Node>(),
  memo = new Map<TSESTree.Node, boolean>(),
): boolean {
  const visited = new Set<TSESTree.Node>();
  let resolved = unwrapTypeScriptExpression(expression);
  while (resolved.type === 'Identifier' && !visited.has(resolved) && !memo.has(resolved)) {
    visited.add(resolved);
    const value = getSimpleBindingValue(context, resolved);
    if (value === resolved) {
      break;
    }
    resolved = unwrapTypeScriptExpression(value);
  }
  if (seen.has(resolved)) {
    return false;
  }
  let result = memo.get(resolved);
  if (result === undefined) {
    seen.add(resolved);
    result = isDefinitelyNonNumericExpression(context, resolved, seen, memo);
    seen.delete(resolved);
    memo.set(resolved, result);
  }
  for (const identifier of visited) {
    memo.set(identifier, result);
  }
  return result;
}

function isDefinitelyNonNumericExpression(
  context: Rule.RuleContext,
  resolved: TSESTree.Node,
  seen: Set<TSESTree.Node>,
  memo: Map<TSESTree.Node, boolean>,
): boolean {
  const scope = context.sourceCode.getScope(resolved as Node) as unknown as TSESLint.Scope.Scope;
  const evaluated = ASTUtils.getStaticValue(resolved, scope);
  if (evaluated !== null) {
    return !isNumericCurrentValue(evaluated.value);
  }
  switch (resolved.type) {
    case 'ConditionalExpression':
      return (
        isDefinitelyNonNumeric(context, resolved.consequent, seen, memo) &&
        isDefinitelyNonNumeric(context, resolved.alternate, seen, memo)
      );
    case 'ObjectExpression':
    case 'ArrayExpression':
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
    case 'ClassExpression':
    case 'NewExpression':
    case 'JSXElement':
    case 'JSXFragment':
      return true;
    case 'UnaryExpression':
      return ['!', 'void', 'typeof', 'delete'].includes(resolved.operator);
    case 'BinaryExpression':
      return ['==', '===', '!=', '!==', '<', '>', '<=', '>=', 'in', 'instanceof'].includes(
        resolved.operator,
      );
    default:
      return false;
  }
}

/**
 * Accepts native HTML editing hosts with one direct, statically enabled contenteditable attribute.
 */
/**
 * Requires a proven HTML editing host with an exact JSX attribute name.
 *
 * @example Pseudocode
 * <div contentEditable="plaintext-only" /> -> true
 * <div contenteditable="true" />           -> false
 * <svg><div contentEditable /></svg>        -> false
 */
function isEditableHtmlHost(opening: TSESTree.JSXOpeningElement): boolean {
  const element = {
    type: 'JSXElement' as const,
    openingElement: opening,
  } as TSESTree.JSXElement;
  if (
    !isHtmlElement(element) ||
    opening.name.type !== 'JSXIdentifier' ||
    opening.name.name === 'svg' ||
    opening.name.name === 'math' ||
    SHARED_HTML_SVG_TAG_NAMES.has(opening.name.name) ||
    !isInHtmlNamespace(opening)
  ) {
    return false;
  }

  const attribute = directContentEditableAttribute(opening);
  if (
    !attribute ||
    attribute.name.type !== 'JSXIdentifier' ||
    attribute.name.name !== 'contentEditable'
  ) {
    return false;
  }
  if (attribute.value === null) {
    return true;
  }
  const expression =
    attribute.value.type === 'JSXExpressionContainer'
      ? attribute.value.expression
      : attribute.value;
  // A template without expressions is a literal value. Other expressions may be dynamic.
  const value =
    expression.type === 'Literal'
      ? expression.value
      : expression.type === 'TemplateLiteral' && expression.expressions.length === 0
        ? expression.quasis[0].value.cooked
        : null;
  return (
    value === true ||
    (typeof value === 'string' && ['', 'true', 'plaintext-only'].includes(value.toLowerCase()))
  );
}

function directContentEditableAttribute(
  opening: TSESTree.JSXOpeningElement,
): JSXAttribute | undefined {
  const attributes = (opening as unknown as JSXOpeningElement).attributes;
  const contentEditableAttributes = attributes.filter(
    (attribute): attribute is JSXAttribute =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name.toLowerCase() === 'contenteditable',
  );
  if (contentEditableAttributes.length !== 1) {
    return undefined;
  }
  // A spread can add a case variant or override the direct contenteditable attribute.
  return attributes.some(candidate => candidate.type === 'JSXSpreadAttribute')
    ? undefined
    : contentEditableAttributes[0];
}

function getSimpleBindingValue(
  context: Rule.RuleContext,
  expression: TSESTree.Identifier,
): TSESTree.Node {
  const variable = getVariableFromName(context, expression.name, expression as Node);
  const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
  // For destructuring, writeExpr is the whole source, not the bound property or element.
  if (definition?.type !== 'Variable' || definition.node.id.type !== 'Identifier') {
    return expression;
  }
  // Loop-head writeExpr is the iterable, not the current element or key.
  const parent = (definition.node as TSESTree.VariableDeclarator).parent?.parent;
  if (parent?.type === 'ForOfStatement' || parent?.type === 'ForInStatement') {
    return expression;
  }
  // Only direct initializers and plain assignments bind writeExpr itself.
  const writes = variable?.references.filter(ref => ref.isWrite());
  const target = writes?.length === 1 ? (writes[0].identifier as TSESTree.Node) : undefined;
  const write = target?.parent;
  if (
    (write?.type === 'VariableDeclarator' && write.id === target) ||
    (write?.type === 'AssignmentExpression' && write.operator === '=' && write.left === target)
  ) {
    return getUniqueWriteUsageOrNode(context, expression as Node) as TSESTree.Node;
  }
  return expression;
}
