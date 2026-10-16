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
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import { isInHtmlNamespace, openingElementOf } from './helpers.js';
import * as meta from './generated-meta.js';

// These tag names can also identify SVG elements when React renders through a component.
const SHARED_HTML_SVG_TAG_NAMES = new Set(['a', 'font', 'image', 'script', 'style', 'title']);

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (isTabIndexOutsideSequentialFocusOrder(reportDescriptor)) {
        return;
      }
      const opening = openingElementOf(reportDescriptor);
      if (opening !== undefined && isEditableHtmlHost(opening)) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}

/**
 * Requires a proven HTML editing host with an exact JSX attribute name.
 *
 * @example
 * <div contentEditable="plaintext-only" /> -> true
 * <div contenteditable="true" />           -> false
 * <svg><div contentEditable /></svg>        -> false
 */
function isEditableHtmlHost(opening: TSESTree.JSXOpeningElement): boolean {
  const element = {
    type: 'JSXElement' as const,
    openingElement: opening,
  } as TSESTree.JSXElement;
  if (!isHtmlElement(element)) {
    return false;
  }
  // A shared tag name does not make an SVG or MathML element an HTML editing host.
  if (
    opening.name.type !== 'JSXIdentifier' ||
    opening.name.name === 'svg' ||
    opening.name.name === 'math' ||
    SHARED_HTML_SVG_TAG_NAMES.has(opening.name.name) ||
    !isInHtmlNamespace(opening)
  ) {
    return false;
  }

  const attribute = directContentEditableAttribute(opening);
  if (!attribute || attribute.name.name !== 'contentEditable') {
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
  let value: unknown;
  if (expression.type === 'Literal') {
    value = expression.value;
  } else if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) {
    value = expression.quasis[0].value.cooked;
  } else {
    return false;
  }
  return (
    value === true ||
    (typeof value === 'string' && ['', 'true', 'plaintext-only'].includes(value.toLowerCase()))
  );
}

/**
 * Finds one direct contentEditable attribute without a spread.
 *
 * @example
 * <div contentEditable="true" />            -> attribute
 * <div {...props} contentEditable="true" /> -> undefined
 * <div contentEditable contenteditable />   -> undefined
 */
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
  // An earlier spread can add a differently cased HTML attribute that a direct attribute does not override.
  return attributes.some(candidate => candidate.type === 'JSXSpreadAttribute')
    ? undefined
    : contentEditableAttributes[0];
}

/**
 * Requires no spreads or later tabIndex attributes.
 *
 * @example
 * <div tabIndex={disabled ? null : -1} /> -> true
 * <div tabIndex={disabled ? null : 0} />  -> false
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
 * Rejects any spread or later tabIndex attribute, including case variants.
 *
 * @example For the first tabIndex
 * <div tabIndex={value} title="Title" />   -> true
 * <div tabIndex={value} tabIndex={0} />    -> false
 * <div tabIndex={value} {...props} />      -> false
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
 * Every leaf must be null or a negative integer literal.
 *
 * @example
 * condition ? null : nested ? -1 : -2 -> true
 * condition ? null : 0                 -> false
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
