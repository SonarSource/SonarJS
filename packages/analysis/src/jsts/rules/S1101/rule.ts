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
import { computeAccessibleName, getStaticHref } from './accessible-name.js';
import { normalizeDestination } from './destination.js';
import * as meta from './generated-meta.js';

const messages = {
  identicalTextDifferentTarget:
    'Use a distinct text or label, or point to the same target for this link and the one on line {{line}}.',
};

const ARIA_HIDDEN = 'aria-hidden';

// Props whose presence in a spread makes the anchor unresolvable.
const RELEVANT_PROPS = [
  'href',
  'aria-labelledby',
  'aria-label',
  'title',
  'hidden',
  ARIA_HIDDEN,
  'style',
];

const DISPLAY_NONE_PATTERN = /display\s*:\s*none/i;

export type JsxAttributes = (JSXAttribute | JSXSpreadAttribute)[];

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
      return statement.body.length > 0 && alwaysExits(statement.body.at(-1) as TSESTree.Statement);
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

// True when a wrapping JSX element hides the anchor from every user, e.g. `<div aria-hidden="true">`.
function isHiddenByAncestor(anchor: TSESTree.JSXElement, context: Rule.RuleContext): boolean {
  let node: TSESTree.Node | undefined = anchor.parent;
  while (node) {
    if (node.type === 'JSXElement') {
      const attributes = (node.openingElement as unknown as JSXOpeningElement).attributes;
      if (!isSpreadSafe(attributes, context) || isLinkHidden(attributes, context)) {
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

// False when a spread attribute could dynamically set href, aria-labelledby, aria-label, title, or a visibility prop (hidden/aria-hidden/style), making the anchor unresolvable.
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
