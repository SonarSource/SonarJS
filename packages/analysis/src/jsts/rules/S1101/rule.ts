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
// https://sonarsource.github.io/rspec/#/rspec/S1101/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type { JSXAttribute, JSXOpeningElement, JSXSpreadAttribute } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
const { getProp, getLiteralPropValue } = pkg;
import { generateMeta } from '../helpers/generate-meta.js';
import { getElementType } from '../helpers/accessibility.js';
import { functionLike, getValueOfExpression, getProperty } from '../helpers/ast.js';
import { isArgumentOfRenderingCall } from '../helpers/jsx.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import * as meta from './generated-meta.js';

const messages = {
  identicalTextDifferentTarget:
    'Use distinct texts or point to the same target for this link and the one at line {{line}}.',
};

// Props whose presence in a spread makes the anchor unresolvable: they can change the accessible
// name, the destination, or the visibility of the link.
const RELEVANT_PROPS = ['href', 'aria-label', 'title', 'hidden', 'aria-hidden', 'style'];

const ROUTING_FRAGMENT_PATTERN = /^#[!/]/;
const DUMMY_BASE = 'https://sonarjs-placeholder.invalid/';
const DISPLAY_NONE_PATTERN = /display\s*:\s*none/i;

type JsxAttributes = (JSXAttribute | JSXSpreadAttribute)[];
type JsxChild = TSESTree.JSXElement['children'][number];

interface LinkInfo {
  name: string;
  href: string;
  node: TSESTree.JSXOpeningElement;
  scope: TSESTree.Node;
  conditional: boolean;
  conditionalRoot: TSESTree.Node | undefined;
  followsGuard: boolean;
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

        if (isLinkHidden(attributes, context)) {
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

        const { scope, conditional, conditionalRoot, followsGuard } = resolveScope(element);

        links.push({
          name,
          href: normalizeDestination(href),
          node: opening,
          scope,
          conditional,
          conditionalRoot,
          followsGuard,
        });
      },

      'Program:exit'() {
        checkLinks(context, links);
      },
    };
  },
};

function checkLinks(context: Rule.RuleContext, links: LinkInfo[]) {
  // Keyed by scope identity then accessible name; holds only unconditional links, the sole reliable baseline.
  const baselinesByScope = new Map<TSESTree.Node, Map<string, LinkInfo>>();

  for (const link of links) {
    let siblingBaselines = baselinesByScope.get(link.scope);
    if (!siblingBaselines) {
      siblingBaselines = new Map();
      baselinesByScope.set(link.scope, siblingBaselines);
    }

    const baseline = siblingBaselines.get(link.name);
    if (baseline && link.href !== baseline.href && !shareConditionalRoot(link, baseline)) {
      report(
        context,
        {
          node: link.node as unknown as estree.Node,
          message: messages.identicalTextDifferentTarget,
          messageId: 'identicalTextDifferentTarget',
          data: { line: String(baseline.node.loc.start.line) },
        },
        [toSecondaryLocation(baseline.node, 'Link with the same text.')],
      );
    }
    // Always register, even on a match, so an unconditional link can solidify the baseline.
    registerBaseline(siblingBaselines, link);
  }
}

// Only two links sharing the same root are exclusive, and not when both merely follow it as a guard.
function shareConditionalRoot(a: LinkInfo, b: LinkInfo): boolean {
  if (a.conditionalRoot === undefined || a.conditionalRoot !== b.conditionalRoot) {
    return false;
  }
  return !(a.followsGuard && b.followsGuard);
}

function registerBaseline(siblingBaselines: Map<string, LinkInfo>, link: LinkInfo) {
  const existing = siblingBaselines.get(link.name);
  // An unconditional link always wins; a conditional one only seeds an empty slot.
  if (!link.conditional || !existing) {
    siblingBaselines.set(link.name, link);
  }
}

// Finds the nearest shared JSX container (or enclosing function/file) and the closest conditional branch, if any.
interface ConditionalMatch {
  root: TSESTree.Node;
  followsGuard: boolean;
}

function resolveScope(anchor: TSESTree.JSXElement): {
  scope: TSESTree.Node;
  conditional: boolean;
  conditionalRoot: TSESTree.Node | undefined;
  followsGuard: boolean;
} {
  let node: TSESTree.Node = anchor;
  let conditional = false;
  let match: ConditionalMatch | undefined;
  for (;;) {
    const parent: TSESTree.Node | undefined = node.parent;
    if (!parent) {
      return finalizeScope(node, conditional, match);
    }
    if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
      return finalizeScope(parent, conditional, match);
    }
    const found = matchConditional(parent, node);
    if (found) {
      conditional = true;
      match ??= found;
    }
    if (isScopeBoundary(parent)) {
      return finalizeScope(parent, conditional, match);
    }
    node = parent;
  }
}

function finalizeScope(
  scope: TSESTree.Node,
  conditional: boolean,
  match: ConditionalMatch | undefined,
) {
  return {
    scope,
    conditional,
    conditionalRoot: match?.root,
    followsGuard: match?.followsGuard ?? false,
  };
}

// `child` is conditional if it's a direct branch of `parent`, or follows a guard inside it.
function matchConditional(
  parent: TSESTree.Node,
  child: TSESTree.Node,
): ConditionalMatch | undefined {
  const branchRoot = getConditionalRoot(parent, child);
  if (branchRoot) {
    return { root: branchRoot, followsGuard: false };
  }
  if (parent.type === 'BlockStatement') {
    const guard = findEarlyReturnGuard(parent, child);
    if (guard) {
      return { root: guard, followsGuard: true };
    }
  }
  return undefined;
}

function isScopeBoundary(node: TSESTree.Node): boolean {
  if (node.type === 'Program') {
    return true;
  }
  if (!functionLike.has(node.type)) {
    return false;
  }
  if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    return !isArgumentOfRenderingCall(node);
  }
  return true;
}

// Finds the closest earlier else-less `if` that always exits, whose implicit "else" this is.
function findEarlyReturnGuard(
  block: TSESTree.BlockStatement,
  statement: TSESTree.Node,
): TSESTree.IfStatement | undefined {
  const index = block.body.indexOf(statement as TSESTree.Statement);
  if (index <= 0) {
    return undefined;
  }
  for (let i = index - 1; i >= 0; i--) {
    const candidate = block.body[i];
    if (isEarlyReturnGuard(candidate)) {
      return candidate as TSESTree.IfStatement;
    }
  }
  return undefined;
}

function isEarlyReturnGuard(statement: TSESTree.Node): boolean {
  return (
    statement.type === 'IfStatement' && !statement.alternate && alwaysExits(statement.consequent)
  );
}

// Conservative: only recognizes the common return/throw and nested-if-with-both-branches shapes,
// so an undetected exit path simply falls back to the previous (safe) unconditional treatment.
function alwaysExits(statement: TSESTree.Node): boolean {
  switch (statement.type) {
    case 'ReturnStatement':
    case 'ThrowStatement':
      return true;
    case 'BlockStatement':
      return statement.body.length > 0 && alwaysExits(statement.body[statement.body.length - 1]);
    case 'IfStatement':
      return (
        !!statement.alternate &&
        alwaysExits(statement.consequent) &&
        alwaysExits(statement.alternate)
      );
    default:
      return false;
  }
}

// Returns the conditional's root node if `child` is one of `parent`'s branches, else undefined.
function getConditionalRoot(
  parent: TSESTree.Node,
  child: TSESTree.Node,
): TSESTree.Node | undefined {
  switch (parent.type) {
    case 'ConditionalExpression':
      return parent.consequent === child || parent.alternate === child ? parent : undefined;
    case 'LogicalExpression': {
      const isBranch =
        parent.operator === '&&'
          ? parent.right === child
          : parent.left === child || parent.right === child;
      return isBranch ? parent : undefined;
    }
    case 'IfStatement':
      return parent.consequent === child || parent.alternate === child ? parent : undefined;
    case 'SwitchCase':
      return (parent.consequent as TSESTree.Node[]).includes(child)
        ? (parent.parent ?? parent)
        : undefined;
    default:
      return undefined;
  }
}

// True when the anchor is hidden from every user via aria-hidden, `hidden`, or `display: none`; unresolvable values are never treated as hidden.
function isLinkHidden(attributes: JsxAttributes, context: Rule.RuleContext): boolean {
  return (
    isAriaHidden(attributes) ||
    isHiddenAttributeSet(attributes) ||
    isDisplayNone(attributes, context)
  );
}

function isAriaHidden(attributes: JsxAttributes): boolean {
  const attribute = getProp(attributes, 'aria-hidden');
  return !!attribute && getLiteralPropValue(attribute) === true;
}

function isHiddenAttributeSet(attributes: JsxAttributes): boolean {
  const attribute = getProp(attributes, 'hidden') as JSXAttribute | undefined;
  if (!attribute) {
    return false;
  }
  if (attribute.value === null) {
    // Shorthand boolean attribute, e.g. `<a hidden>`.
    return true;
  }
  return getLiteralPropValue(attribute) === true;
}

function isDisplayNone(attributes: JsxAttributes, context: Rule.RuleContext): boolean {
  const styleAttribute = getProp(attributes, 'style') as JSXAttribute | undefined;
  const value = styleAttribute?.value;
  if (!value) {
    return false;
  }
  if (value.type === 'Literal') {
    return typeof value.value === 'string' && DISPLAY_NONE_PATTERN.test(value.value);
  }
  if (value.type !== 'JSXExpressionContainer') {
    return false;
  }
  const resolvedStyle = getValueOfExpression(
    context,
    value.expression as unknown as estree.Node,
    'ObjectExpression',
  );
  const displayProperty = resolvedStyle && getProperty(resolvedStyle, 'display', context);
  const displayValue =
    displayProperty && getValueOfExpression(context, displayProperty.value, 'Literal');
  return (
    typeof displayValue?.value === 'string' && displayValue.value.trim().toLowerCase() === 'none'
  );
}

// False when a spread attribute could dynamically set href, aria-label, title, or a visibility prop (hidden/aria-hidden/style), making the anchor unresolvable.
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

// Only a string literal or an expression-free template literal is accepted; anything else is treated as dynamic.
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

// Accessible name precedence: aria-label > text content (skipping aria-hidden, using nested img alt) > title, per S6827; null if unresolved or empty.
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

// Resolves an attribute's static string value, treating a non-string literal or boolean shorthand as empty; undefined when dynamic.
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
    const { value } = expression;
    if (typeof value === 'string') {
      return value;
    }
    // Numbers render as visible text; null/booleans render nothing.
    return typeof value === 'number' || typeof value === 'bigint' ? String(value) : '';
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
  const isProtocolRelative = href.startsWith('//');
  let url: URL;
  try {
    url = new URL(href, DUMMY_BASE);
  } catch {
    return href;
  }
  const scheme = hasScheme || isProtocolRelative ? normalizeScheme(url.protocol) : '';
  const authority = (hasScheme || isProtocolRelative) && url.host ? `//${url.host}` : '';
  const keepFragment = ROUTING_FRAGMENT_PATTERN.test(url.hash);
  return `${scheme}${authority}${url.pathname}${url.search}${keepFragment ? url.hash : ''}`;
}

function normalizeScheme(protocol: string): string {
  return protocol === 'https:' ? 'http:' : protocol;
}
