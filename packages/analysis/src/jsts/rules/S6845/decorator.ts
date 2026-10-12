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
import { roles } from 'aria-query';
import type { Rule, Scope } from 'eslint';
import type { Node } from 'estree';
import {
  getUniqueWriteUsageOrNode,
  getVariableFromName,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const CONCRETE_ROLES = new Set<string>(roles.keys().filter(name => !roles.get(name)!.abstract));
const ARIA_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Allows intrinsic div separator widgets with a supplied current value.
 * @param rule the upstream accessibility rule
 * @return the rule with separator reports filtered
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      if (isTabIndexOutsideSequentialFocusOrder(descriptor)) {
        return;
      }
      const node = 'node' in descriptor ? (descriptor.node as TSESTree.Node) : undefined;
      const opening = node?.type === 'JSXAttribute' ? node.parent : undefined;
      if (opening?.type === 'JSXOpeningElement' && isSeparatorWidget(context, opening)) {
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
  if (opening.name.type !== 'JSXIdentifier' || opening.name.name !== 'div') {
    return false;
  }
  const role = attributeExpression(effectiveAttribute(context, opening, 'role'));
  if (role?.type !== 'Literal' || typeof role.value !== 'string') {
    return false;
  }
  const effectiveRole = role.value
    .trim()
    .split(/\s+/)
    .find(name => CONCRETE_ROLES.has(name));
  return (
    effectiveRole === 'separator' &&
    hasCurrentValue(context, effectiveAttribute(context, opening, 'aria-valuenow'))
  );
}

/**
 * Finds an explicitly declared attribute that cannot be overridden by a spread.
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
): boolean {
  const expression = unwrapTypeScriptExpression(argument);
  if (seen.has(expression)) {
    return true;
  }
  const visited = new Set(seen).add(expression);
  if (expression.type === 'Identifier') {
    const variable = getVariableFromName(context, expression.name, expression as Node);
    // Other reads could mutate or pass the object to code that adds an attribute.
    if (!variable || variable.references.some(ref => ref.isRead() && !isSpreadReference(ref))) {
      return true;
    }
    const value = getUniqueWriteUsageOrNode(context, expression as Node) as TSESTree.Node;
    return value === expression || canSpreadOverrideAttribute(context, value, name, visited);
  }
  if (expression.type !== 'ObjectExpression') {
    return true;
  }
  return expression.properties.some(property => {
    if (property.type === 'SpreadElement') {
      return canSpreadOverrideAttribute(context, property.argument, name, visited);
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
    return true;
  }
  const value = evaluated.value;
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
