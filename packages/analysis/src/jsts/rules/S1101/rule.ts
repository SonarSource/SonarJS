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
import { getConditionalBranchRoot, isArgumentOfRenderingCall } from '../helpers/jsx.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import * as meta from './generated-meta.js';

const messages = {
  identicalTextDifferentTarget:
    'Use a distinct text or label, or point to the same target for this link and the one on line {{line}}.',
};

const ARIA_LABELLEDBY = 'aria-labelledby';
const ARIA_LABEL = 'aria-label';
const ARIA_HIDDEN = 'aria-hidden';

// Props whose presence in a spread makes the anchor unresolvable.
const RELEVANT_PROPS = [
  'href',
  ARIA_LABELLEDBY,
  ARIA_LABEL,
  'title',
  'hidden',
  ARIA_HIDDEN,
  'style',
];

const ROUTING_FRAGMENT_PATTERN = /^#[!/]/;
const DUMMY_BASE = 'https://sonarjs-placeholder.invalid/';
const DISPLAY_NONE_PATTERN = /display\s*:\s*none/i;
// Namespaces an aria-labelledby-derived key so it can never collide with a text- or
// aria-label-derived accessible name that happens to share the same characters.
const LABELLEDBY_KEY_PREFIX = ' labelledby:';

type JsxAttributes = (JSXAttribute | JSXSpreadAttribute)[];
type JsxChild = TSESTree.JSXElement['children'][number];

interface LinkInfo {
  name: string;
  href: string;
  node: TSESTree.JSXOpeningElement;
  scope: TSESTree.Node;
  conditionals: ConditionalMatch[];
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

        if (isLinkHidden(attributes, context) || isHiddenByAncestor(element, context)) {
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

        const { scope, conditionals } = resolveScope(element);

        links.push({
          name,
          href: normalizeDestination(href),
          node: opening,
          scope,
          conditionals,
        });
      },

      'Program:exit'() {
        checkLinks(context, links);
      },
    };
  },
};

function checkLinks(context: Rule.RuleContext, links: LinkInfo[]) {
  // Keyed by scope then accessible name; holds every link seen so far, not just the last one.
  const candidatesByScope = new Map<TSESTree.Node, Map<string, LinkInfo[]>>();

  for (const link of links) {
    let siblingCandidates = candidatesByScope.get(link.scope);
    if (!siblingCandidates) {
      siblingCandidates = new Map();
      candidatesByScope.set(link.scope, siblingCandidates);
    }

    const candidates = siblingCandidates.get(link.name);
    const conflict = candidates && findConflict(candidates, link);
    if (conflict) {
      report(
        context,
        {
          node: link.node as unknown as estree.Node,
          message: messages.identicalTextDifferentTarget,
          messageId: 'identicalTextDifferentTarget',
          data: { line: String(conflict.node.loc.start.line) },
        },
        [toSecondaryLocation(conflict.node, 'Link with the same text or label.')],
      );
    }
    if (candidates) {
      candidates.push(link);
    } else {
      siblingCandidates.set(link.name, [link]);
    }
  }
}

// The nearest preceding sibling that can render alongside `link` with a different target.
function findConflict(candidates: LinkInfo[], link: LinkInfo): LinkInfo | undefined {
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i];
    if (candidate.href !== link.href && !areExclusive(link, candidate)) {
      return candidate;
    }
  }
  return undefined;
}

// Exclusive if any shared conditional ancestor puts them in different branches.
function areExclusive(a: LinkInfo, b: LinkInfo): boolean {
  return a.conditionals.some(x =>
    b.conditionals.some(y => x.root === y.root && x.branch !== y.branch),
  );
}

// A conditional ancestor: `root` is the construct, `branch` identifies which branch it's in.
interface ConditionalMatch {
  root: TSESTree.Node;
  branch: TSESTree.Node | 'after-guard';
}

function resolveScope(anchor: TSESTree.JSXElement): {
  scope: TSESTree.Node;
  conditionals: ConditionalMatch[];
} {
  let node: TSESTree.Node = anchor;
  const conditionals: ConditionalMatch[] = [];
  for (;;) {
    const parent: TSESTree.Node | undefined = node.parent;
    if (!parent) {
      return { scope: node, conditionals };
    }
    if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
      return { scope: parent, conditionals };
    }
    conditionals.push(...matchConditional(parent, node));
    if (isScopeBoundary(parent)) {
      return { scope: parent, conditionals };
    }
    node = parent;
  }
}

// `child` is conditional if it's a direct branch of `parent`, or follows one or more guards inside it.
function matchConditional(parent: TSESTree.Node, child: TSESTree.Node): ConditionalMatch[] {
  const branchRoot = getConditionalBranchRoot(parent, child);
  if (branchRoot) {
    // A switch case's branch identity is the case itself, not the individual statement.
    const branch = parent.type === 'SwitchCase' ? parent : child;
    return [{ root: branchRoot, branch }];
  }
  if (parent.type === 'BlockStatement') {
    return findEarlyReturnGuards(parent, child).map(guard => ({
      root: guard,
      branch: 'after-guard' as const,
    }));
  }
  return [];
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

// Finds every earlier else-less `if` that always exits, not just the closest one.
function findEarlyReturnGuards(
  block: TSESTree.BlockStatement,
  statement: TSESTree.Node,
): TSESTree.IfStatement[] {
  const index = block.body.indexOf(statement as TSESTree.Statement);
  if (index <= 0) {
    return [];
  }
  const guards: TSESTree.IfStatement[] = [];
  for (let i = index - 1; i >= 0; i--) {
    const candidate = block.body[i];
    if (isEarlyReturnGuard(candidate)) {
      guards.push(candidate as TSESTree.IfStatement);
    }
  }
  return guards;
}

function isEarlyReturnGuard(statement: TSESTree.Node): boolean {
  return (
    statement.type === 'IfStatement' && !statement.alternate && alwaysExits(statement.consequent)
  );
}

// Conservative: only recognizes the common return/throw and nested-if-with-both-branches shapes.
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

// True when the anchor is hidden from every user via aria-hidden, `hidden`, or `display: none`; unresolvable values are never treated as hidden.
function isLinkHidden(attributes: JsxAttributes, context: Rule.RuleContext): boolean {
  return (
    isAriaHidden(attributes) ||
    isHiddenAttributeSet(attributes) ||
    isDisplayNone(attributes, context)
  );
}

// True when a wrapping JSX element hides the anchor from every user - e.g. `<div aria-hidden="true">`.
// Such an anchor is removed from the accessibility tree just as surely as if it were hidden itself.
function isHiddenByAncestor(anchor: TSESTree.JSXElement, context: Rule.RuleContext): boolean {
  let node: TSESTree.Node | undefined = anchor.parent;
  while (node) {
    if (node.type === 'JSXElement') {
      const attributes = (node.openingElement as unknown as JSXOpeningElement).attributes;
      if (isLinkHidden(attributes, context)) {
        return true;
      }
    }
    node = node.parent;
  }
  return false;
}

function isAriaHidden(attributes: JsxAttributes): boolean {
  const attribute = getProp(attributes, ARIA_HIDDEN);
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
      return cookTemplateLiteral(expression) ?? null;
    }
  }
  return null;
}

// Joins an expression-free template literal's quasis, or undefined if any has an unparsable escape sequence.
function cookTemplateLiteral(expression: estree.TemplateLiteral): string | undefined {
  const cooked = expression.quasis.map(quasi => quasi.value.cooked);
  return cooked.every((value): value is string => value !== undefined)
    ? cooked.join('')
    : undefined;
}

// Accessible name precedence per accname, extended from S6827's aria-label > text content > title
// with aria-labelledby, which outranks all three.
function computeAccessibleName(
  element: TSESTree.JSXElement,
  attributes: JsxAttributes,
  context: Rule.RuleContext,
  elementType: (node: TSESTree.JSXOpeningElement) => string,
): string | null {
  const labelledby = resolveNameStep(attributes, ARIA_LABELLEDBY, normalizeIdList);
  if (labelledby !== undefined) {
    // Best effort: this never resolves the id(s) to the referenced element's actual computed
    // name. Instead it relies on valid markup having document-unique ids, so two anchors
    // referencing the same id(s) are guaranteed to share the same accessible name regardless of
    // their own visible text - and two anchors referencing different ids are treated as having
    // different names, even if those ids happen to resolve to identical text (a false negative,
    // consistent with every other divergence in this section).
    return labelledby === null ? null : LABELLEDBY_KEY_PREFIX + labelledby;
  }

  const ariaLabel = resolveNameStep(attributes, ARIA_LABEL, normalizeName);
  if (ariaLabel !== undefined) {
    return ariaLabel;
  }

  const textContent = computeTextContent(element.children, context, elementType);
  if (textContent === null) {
    return null;
  }
  const normalizedText = normalizeName(textContent);
  if (normalizedText) {
    return normalizedText;
  }

  return resolveNameStep(attributes, 'title', normalizeName) ?? null;
}

// Resolves one accessible-name precedence step: undefined means "fall through to the next step"
// (the attribute is absent, or resolves to an empty name), null means "stop: unresolvable", and a
// string is the resolved name for this step.
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
    case 'JSXExpressionContainer':
      return computeExpressionContainerContribution(child.expression);
    case 'JSXElement':
      return computeElementChildContribution(child, context, elementType);
    case 'JSXFragment':
      return computeTextContent(child.children, context, elementType);
    default:
      // JSXSpreadChild and anything else: not statically resolvable.
      return null;
  }
}

function computeExpressionContainerContribution(
  expression: TSESTree.JSXExpressionContainer['expression'],
): string | null {
  if (expression.type === 'JSXEmptyExpression') {
    return '';
  }
  if (expression.type === 'Identifier' && expression.name === 'undefined') {
    return '';
  }
  const staticValue = getStaticTextFromExpression(expression as estree.Expression);
  return staticValue ?? null;
}

// A nested element's own accessible name, following the same "name from content" precedence the
// anchor itself uses: aria-labelledby (unresolvable, since we never resolve it) > aria-label >
// its native markup (only <img alt> today) > its own text content.
function computeElementChildContribution(
  child: TSESTree.JSXElement,
  context: Rule.RuleContext,
  elementType: (node: TSESTree.JSXOpeningElement) => string,
): string | null {
  const opening = child.openingElement;
  const attributes = (opening as unknown as JSXOpeningElement).attributes;

  const hiddenState = ariaHiddenState(attributes);
  if (hiddenState === 'unknown') {
    return null;
  }
  if (hiddenState === 'hidden') {
    return '';
  }

  // A nested element named by aria-labelledby takes its name from an element we never
  // resolve, so this contribution is unresolvable - exclude rather than fall back to its
  // text content, same treatment as the anchor's own unresolvable aria-labelledby.
  if (getProp(attributes, ARIA_LABELLEDBY)) {
    return null;
  }

  // A nested element's own aria-label overrides its content, same as accname's "name from
  // content" step - e.g. a nested `<svg aria-label="Download">` icon, not just `<img alt>`.
  const ownAriaLabel = resolveNameStep(attributes, ARIA_LABEL, value => value);
  if (ownAriaLabel !== undefined) {
    return ownAriaLabel;
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

function ariaHiddenState(attributes: JsxAttributes): 'hidden' | 'visible' | 'unknown' {
  const attribute = getProp(attributes, ARIA_HIDDEN);
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
    return cookTemplateLiteral(expression);
  }
  return undefined;
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

// Unlike normalizeName, an id list is not case-folded: HTML ids are case-sensitive, and folding
// them could wrongly treat two anchors referencing distinct ids as sharing the same name.
function normalizeIdList(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
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
