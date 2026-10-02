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

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
const { getProp, getLiteralPropValue } = pkg;
import { cookTemplateLiteral, getStaticExpressionValue } from '../helpers/ast.js';
import { getStaticText } from '../helpers/jsx.js';
import type { JsxAttributes } from './rule.js';

const ARIA_LABELLEDBY = 'aria-labelledby';
const ARIA_LABEL = 'aria-label';
// Namespaces an aria-labelledby-derived key so it can never collide with a text/aria-label name.
const LABELLEDBY_KEY_PREFIX = ' labelledby:';

type JsxChild = TSESTree.JSXElement['children'][number];

// Only a string literal or an expression-free template literal is accepted; anything else is treated as dynamic.
export function getStaticHref(value: JSXAttribute['value']): string | undefined {
  if (value?.type === 'Literal') {
    return typeof value.value === 'string' ? value.value : undefined;
  }
  if (value?.type === 'JSXExpressionContainer') {
    const expression = value.expression;
    if (expression.type === 'Literal' && typeof expression.value === 'string') {
      return expression.value;
    }
    if (expression.type === 'TemplateLiteral') {
      return cookTemplateLiteral(expression);
    }
  }
  return undefined;
}

// Accessible name precedence per accname: aria-labelledby > aria-label > text content > title.
export function computeAccessibleName(
  element: TSESTree.JSXElement,
  attributes: JsxAttributes,
  context: Rule.RuleContext,
  elementType: (node: TSESTree.JSXOpeningElement) => string,
): string | null {
  const labelledby = resolveNameStep(attributes, ARIA_LABELLEDBY, normalizeIdRefList);
  if (labelledby !== undefined) {
    // Best effort: compares the referenced id(s) directly rather than resolving them to a name.
    return labelledby === null ? null : LABELLEDBY_KEY_PREFIX + labelledby;
  }

  const ariaLabel = resolveNameStep(attributes, ARIA_LABEL, normalizeAccessibleName);
  if (ariaLabel !== undefined) {
    return ariaLabel;
  }

  const textContent = computeTextContent(element.children, context, elementType);
  if (textContent === undefined) {
    return null;
  }
  const normalizedText = normalizeAccessibleName(textContent);
  if (normalizedText) {
    return normalizedText;
  }

  return resolveNameStep(attributes, 'title', normalizeAccessibleName) ?? null;
}

// One precedence step: undefined falls through, null means unresolvable, a string is the name.
function resolveNameStep(
  attributes: JsxAttributes,
  prop: string,
  normalize: (raw: string) => string,
): string | null | undefined {
  const attribute = getProp(attributes, prop) as JSXAttribute | undefined;
  if (!attribute) {
    return undefined;
  }
  const staticValue = getStaticText(attribute.value);
  // An unresolvable value is very likely non-empty at runtime, so exclude rather than guess.
  if (staticValue === undefined) {
    return null;
  }
  return normalize(staticValue) || undefined;
}

function computeTextContent(
  children: JsxChild[],
  context: Rule.RuleContext,
  elementType: (node: TSESTree.JSXOpeningElement) => string,
): string | undefined {
  let text = '';
  for (const child of children) {
    const contribution = computeChildContribution(child, context, elementType);
    if (contribution === undefined) {
      return undefined;
    }
    text += contribution;
  }
  return text;
}

function computeChildContribution(
  child: JsxChild,
  context: Rule.RuleContext,
  elementType: (node: TSESTree.JSXOpeningElement) => string,
): string | undefined {
  switch (child.type) {
    case 'JSXText':
      return child.value;
    case 'JSXExpressionContainer':
      return computeExpressionContainerContribution(child.expression);
    case 'JSXElement':
      return computeElementChildContribution(child, context, elementType);
    case 'JSXFragment':
      return computeTextContent(child.children, context, elementType);
    default:
      // JSXSpreadChild and anything else: not statically resolvable.
      return undefined;
  }
}

function computeExpressionContainerContribution(
  expression: TSESTree.JSXExpressionContainer['expression'],
): string | undefined {
  if (expression.type === 'JSXEmptyExpression') {
    return '';
  }
  if (expression.type === 'Identifier' && expression.name === 'undefined') {
    return '';
  }
  return getStaticExpressionValue(expression as estree.Expression);
}

// A nested element's own name: aria-labelledby (unresolvable) > aria-label > <img alt> > its text.
function computeElementChildContribution(
  child: TSESTree.JSXElement,
  context: Rule.RuleContext,
  elementType: (node: TSESTree.JSXOpeningElement) => string,
): string | undefined {
  const opening = child.openingElement;
  const attributes = (opening as unknown as JSXOpeningElement).attributes;

  const hiddenState = ariaHiddenState(attributes);
  if (hiddenState === 'unknown') {
    return undefined;
  }
  if (hiddenState === 'hidden') {
    return '';
  }

  // Named by an element we never resolve, so this contribution is unresolvable - unless the id
  // list itself resolves to empty, which names nothing and falls through like the anchor's own.
  if (resolveNameStep(attributes, ARIA_LABELLEDBY, normalizeIdRefList) !== undefined) {
    return undefined;
  }

  // A nested element's own aria-label overrides its content, e.g. a nested `<svg aria-label>`.
  const ownAriaLabel = resolveNameStep(attributes, ARIA_LABEL, value => value);
  if (ownAriaLabel === null) {
    return undefined;
  }
  if (ownAriaLabel !== undefined) {
    return ownAriaLabel;
  }

  if (elementType(opening).toLowerCase() === 'img') {
    const altAttribute = getProp(attributes, 'alt') as JSXAttribute | undefined;
    if (!altAttribute) {
      return '';
    }
    return getStaticText(altAttribute.value);
  }

  return computeTextContent(child.children, context, elementType);
}

function ariaHiddenState(attributes: JsxAttributes): 'hidden' | 'visible' | 'unknown' {
  const attribute = getProp(attributes, 'aria-hidden');
  if (!attribute) {
    return 'visible';
  }
  const literal = getLiteralPropValue(attribute);
  if (literal === true) {
    return 'hidden';
  }
  if (literal === false) {
    return 'visible';
  }
  return 'unknown';
}

function normalizeAccessibleName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

// Unlike normalizeAccessibleName, this doesn't case-fold: IDREFs (WAI-ARIA/HTML) are case-sensitive.
function normalizeIdRefList(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
