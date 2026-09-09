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
// https://sonarsource.github.io/rspec/#/rspec/S9384/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type { JSXAttribute, JSXOpeningElement, JSXSpreadAttribute } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
const { getProp, getLiteralPropValue } = pkg;
import { generateMeta } from '../helpers/generate-meta.js';
import { getElementType } from '../helpers/accessibility.js';
import { getValueOfExpression, getProperty } from '../helpers/ast.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import * as meta from './generated-meta.js';

const messages = {
  identicalLinkDifferentDestination:
    'This link has the same text as the one on line {{line}}, but points to a different destination.',
};

/**
 * Props that can override the anchor's destination or accessible name; a spread attribute
 * that might set any of these is treated as making the whole anchor unresolvable, mirroring
 * S6827's decorator.
 */
const RELEVANT_PROPS = ['href', 'aria-label', 'title'];

const ROUTING_FRAGMENT_PATTERN = /^#[!/]/;
const DUMMY_BASE = 'http://sonarjs-placeholder.invalid/';

type JsxAttributes = (JSXAttribute | JSXSpreadAttribute)[];
type JsxChild = TSESTree.JSXElement['children'][number];

interface LinkInfo {
  name: string;
  href: string;
  node: TSESTree.JSXOpeningElement;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const elementType = getElementType(context);
    const links: LinkInfo[] = [];

    return {
      JSXElement(node: estree.Node) {
        const element = node as unknown as TSESTree.JSXElement;
        const opening = element.openingElement;
        if (elementType(opening).toLowerCase() !== 'a') {
          return;
        }

        const attributes = (opening as unknown as JSXOpeningElement).attributes;
        if (!isSpreadSafe(attributes, context)) {
          return;
        }

        const hrefAttribute = getProp(attributes, 'href') as JSXAttribute | undefined;
        const href = hrefAttribute && getStaticHref(hrefAttribute.value);
        if (!href) {
          return;
        }

        const name = computeAccessibleName(element, attributes, context, elementType);
        if (!name) {
          return;
        }

        links.push({ name, href: normalizeDestination(href), node: opening });
      },

      'Program:exit'() {
        checkLinks(context, links);
      },
    };
  },
};

function checkLinks(context: Rule.RuleContext, links: LinkInfo[]) {
  const groups = new Map<string, LinkInfo[]>();
  for (const link of links) {
    const group = groups.get(link.name);
    if (group) {
      group.push(link);
    } else {
      groups.set(link.name, [link]);
    }
  }

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }
    const [reference, ...rest] = group;
    for (const link of rest) {
      if (link.href === reference.href) {
        continue;
      }
      report(
        context,
        {
          node: link.node as unknown as estree.Node,
          message: messages.identicalLinkDifferentDestination,
          messageId: 'identicalLinkDifferentDestination',
          data: { line: String(reference.node.loc!.start.line) },
        },
        [toSecondaryLocation(reference.node, 'Link with the same text.')],
      );
    }
  }
}

/**
 * Returns false when a spread attribute could dynamically set the anchor's href,
 * aria-label or title, making the anchor's identity unresolvable.
 */
function isSpreadSafe(attributes: JsxAttributes, context: Rule.RuleContext): boolean {
  return attributes
    .filter((attribute): attribute is JSXSpreadAttribute => attribute.type === 'JSXSpreadAttribute')
    .every(attribute => {
      const resolved = getValueOfExpression(
        context,
        attribute.argument as unknown as estree.Node,
        'ObjectExpression',
      );
      if (!resolved) {
        return false;
      }
      return !RELEVANT_PROPS.some(prop => getProperty(resolved, prop, context) !== null);
    });
}

/**
 * Only a string literal or a template literal without expressions is accepted, per the rule's
 * static-resolution requirement; anything else (including identifiers) is treated as dynamic.
 */
function getStaticHref(value: JSXAttribute['value']): string | null {
  if (value?.type === 'Literal') {
    return typeof value.value === 'string' ? value.value : null;
  }
  if (value?.type === 'JSXExpressionContainer') {
    const expression = value.expression;
    if (expression.type === 'Literal' && typeof expression.value === 'string') {
      return expression.value;
    }
    if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) {
      return expression.quasis.map(quasi => quasi.value.cooked ?? '').join('');
    }
  }
  return null;
}

/**
 * Computes the anchor's accessible name following aria-label > text content
 * (skipping aria-hidden subtrees, using alt on nested images) > title, as established by
 * S6827's decorator. Returns null when the name cannot be resolved statically, or is empty.
 */
function computeAccessibleName(
  element: TSESTree.JSXElement,
  attributes: JsxAttributes,
  context: Rule.RuleContext,
  elementType: (node: TSESTree.JSXOpeningElement) => string,
): string | null {
  const ariaLabelAttribute = getProp(attributes, 'aria-label') as JSXAttribute | undefined;
  if (ariaLabelAttribute) {
    const staticValue = getStaticText(ariaLabelAttribute.value);
    if (staticValue === undefined) {
      return null;
    }
    const normalized = normalizeName(staticValue);
    if (normalized) {
      return normalized;
    }
  }

  const textContent = computeTextContent(element.children, context, elementType);
  if (textContent === null) {
    return null;
  }
  const normalizedText = normalizeName(textContent);
  if (normalizedText) {
    return normalizedText;
  }

  const titleAttribute = getProp(attributes, 'title') as JSXAttribute | undefined;
  if (titleAttribute) {
    const staticTitle = getStaticText(titleAttribute.value);
    if (staticTitle === undefined) {
      return null;
    }
    const normalizedTitle = normalizeName(staticTitle);
    if (normalizedTitle) {
      return normalizedTitle;
    }
  }

  return null;
}

function computeTextContent(
  children: JsxChild[],
  context: Rule.RuleContext,
  elementType: (node: TSESTree.JSXOpeningElement) => string,
): string | null {
  let text = '';
  for (const child of children) {
    const contribution = computeChildContribution(child, context, elementType);
    if (contribution === null) {
      return null;
    }
    text += contribution;
  }
  return text;
}

function computeChildContribution(
  child: JsxChild,
  context: Rule.RuleContext,
  elementType: (node: TSESTree.JSXOpeningElement) => string,
): string | null {
  switch (child.type) {
    case 'JSXText':
      return child.value;
    case 'JSXExpressionContainer': {
      const expression = child.expression;
      if (expression.type === 'JSXEmptyExpression') {
        return '';
      }
      if (expression.type === 'Identifier' && expression.name === 'undefined') {
        return '';
      }
      const staticValue = getStaticTextFromExpression(expression as estree.Expression);
      return staticValue ?? null;
    }
    case 'JSXElement': {
      const opening = child.openingElement;
      const attributes = (opening as unknown as JSXOpeningElement).attributes;

      const hiddenState = ariaHiddenState(attributes);
      if (hiddenState === 'unknown') {
        return null;
      }
      if (hiddenState === 'hidden') {
        return '';
      }

      if (elementType(opening).toLowerCase() === 'img') {
        const altAttribute = getProp(attributes, 'alt') as JSXAttribute | undefined;
        if (!altAttribute) {
          return '';
        }
        const staticAlt = getStaticText(altAttribute.value);
        return staticAlt ?? null;
      }

      return computeTextContent(child.children, context, elementType);
    }
    case 'JSXFragment':
      return computeTextContent(child.children, context, elementType);
    default:
      // JSXSpreadChild and anything else: not statically resolvable.
      return null;
  }
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

/**
 * Resolves the static string value of an attribute, treating a non-string literal or a
 * boolean-shorthand attribute as an empty (but known) value. Returns undefined when the value
 * is dynamic and cannot be resolved statically.
 */
function getStaticText(value: JSXAttribute['value']): string | undefined {
  if (value === null) {
    return '';
  }
  if (value.type === 'Literal') {
    return typeof value.value === 'string' ? value.value : '';
  }
  if (value.type === 'JSXExpressionContainer') {
    if (value.expression.type === 'JSXEmptyExpression') {
      return '';
    }
    if (value.expression.type === 'Identifier' && value.expression.name === 'undefined') {
      return '';
    }
    return getStaticTextFromExpression(value.expression as estree.Expression);
  }
  // JSXElement / JSXFragment used as an attribute value: not a usable string.
  return '';
}

function getStaticTextFromExpression(expression: estree.Expression): string | undefined {
  if (expression.type === 'Literal') {
    return typeof expression.value === 'string' ? expression.value : '';
  }
  if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) {
    return expression.quasis.map(quasi => quasi.value.cooked ?? '').join('');
  }
  return undefined;
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeDestination(href: string): string {
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href);
  let url: URL;
  try {
    url = new URL(href, DUMMY_BASE);
  } catch {
    return href;
  }
  const scheme = hasScheme ? (url.protocol === 'https:' ? 'http:' : url.protocol) : '';
  const keepFragment = ROUTING_FRAGMENT_PATTERN.test(url.hash);
  return `${scheme}${url.pathname}${url.search}${keepFragment ? url.hash : ''}`;
}
