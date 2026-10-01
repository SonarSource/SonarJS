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
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import {
  getUniqueWriteReference,
  getValueOfExpression,
  getVariableFromName,
  isIdentifier,
  isStringLiteral,
  isUndefined,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import * as meta from './generated-meta.js';

/**
 * Upstream `jsx-a11y/heading-has-content` finds heading content in JSX children and in explicit
 * `children` / `dangerouslySetInnerHTML` attributes only. Its `jsx-ast-utils.hasProp` lookup runs
 * with `spreadStrict: true`, so a spread attribute never counts as supplying a prop and
 *
 *   <h1 {...{ children: 'Title' }} />
 *
 * is reported even though the heading renders "Title".
 *
 * This decorator drops a report only where the forwarded content is locally provable: a spread of
 * an object literal - or of a single-write alias of one - whose effective `children` property is
 * present and is not one of the values React renders as nothing. Anything the decorator cannot
 * resolve that far keeps reporting. A call, a member access, an unresolved identifier or a
 * destructured binding says nothing about `children`, so suppressing it would hide the genuinely
 * empty headings this accessibility rule exists to catch.
 *
 * Only `children` is considered. `dangerouslySetInnerHTML` is deliberately left out: forwarding it
 * through a spread is not an idiom worth loosening an accessibility rule for.
 *
 * Because upstream bails out as soon as `hasAnyProp(attributes, CONTENT_PROPS)` matches, any report
 * reaching this decorator is on an element with no explicit `children` / `dangerouslySetInnerHTML`
 * attribute: only spreads can carry those props here.
 */

/** The single content channel this decorator reasons about. */
const CONTENT_PROP = 'children';

/**
 * Literal values React renders as nothing. `0` is deliberately absent: React renders it as "0",
 * so `children: 0` is content even though upstream's own `!!child.value` would call it empty.
 */
const NOTHING_RENDERED = new Set<estree.Literal['value']>([null, false, '']);

/**
 * Spread arguments that provably contribute no named prop. Spreading a string or an array only
 * produces numeric index keys; spreading a number, a boolean, `null` or a regex produces no own
 * enumerable key at all. None of them can carry `children`, so such a spread neither proves content
 * nor overrides a `children` established by an earlier attribute.
 */
const CARRIES_NO_NAMED_PROP = new Set(['Literal', 'TemplateLiteral', 'ArrayExpression']);

/**
 * Whether `value` is one of the values React renders as nothing. Mirrors upstream's notion of
 * inaccessible content in `hasAccessibleChild` (falsy literals, and the identifier `undefined`).
 * Anything else - an identifier, a call, a member expression, a JSX element - counts as content:
 * the `children` channel is then established, which is what this decorator has to prove.
 */
function rendersNothing(context: Rule.RuleContext, value: estree.Node): boolean {
  const unwrapped = unwrapTypeScriptExpression(value);
  const literal = getValueOfExpression(context, unwrapped, 'Literal');
  return literal ? NOTHING_RENDERED.has(literal.value) : isUndefined(unwrapped);
}

/**
 * How a spread settles the content channel:
 * `true` it provably supplies content, `false` it does not - either it provably supplies none, or it
 * cannot be resolved far enough to tell - and `null` it says nothing at all, leaving the channel to
 * whatever applies earlier.
 */
type Settlement = boolean | null;

/**
 * Whether `element` is a non-spread property keyed by `children`.
 *
 * A computed identifier key only names `children` if its *value* happens to be that string, which
 * is not what an identifier named `children` being used as a key proves - so a computed key is
 * trusted only when it is itself the string literal `'children'`.
 */
function isContentProperty(
  element: estree.Property | estree.SpreadElement,
): element is estree.Property {
  return (
    element.type === 'Property' &&
    ((!element.computed && isIdentifier(element.key, CONTENT_PROP)) ||
      (isStringLiteral(element.key) && element.key.value === CONTENT_PROP))
  );
}

/**
 * The expression written to `identifier`, or `undefined` when no single write proves what the
 * identifier holds.
 *
 * A binding introduced by a destructuring pattern is refused: its only write expression is the whole
 * initializer, which says nothing about the binding itself. Resolving it would credit
 * `const { children: _unused, ...rest } = source` with `source`'s `children`, the very property the
 * pattern strips.
 */
function getSoleWriteExpression(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): estree.Node | undefined {
  const variable = getVariableFromName(context, identifier.name, identifier);
  if (variable?.defs.length !== 1) {
    return undefined;
  }
  const [definition] = variable.defs;
  if (definition.type !== 'Variable' || definition.node.id !== definition.name) {
    return undefined;
  }
  return getUniqueWriteReference(variable);
}

/**
 * What `argument` denotes: itself, with TypeScript wrappers removed and provable single-write
 * aliases followed. The walk iterates instead of recursing and carries its own guard, so a self- or
 * mutually-referencing alias (`let a = a`, `let a = b, b = a`) terminates.
 */
function resolveValue(context: Rule.RuleContext, argument: estree.Node): estree.Node {
  const visited = new Set<estree.Node>();
  let current = unwrapTypeScriptExpression(argument);
  while (current.type === 'Identifier' && !visited.has(current)) {
    visited.add(current);
    const write = getSoleWriteExpression(context, current);
    if (write === undefined) {
      return current;
    }
    current = unwrapTypeScriptExpression(write);
  }
  return current;
}

/**
 * How spreading `argument` settles the content channel.
 *
 * Only an object literal can prove anything, so everything else settles the channel as unproven.
 * Values that merely produce numeric index keys, or no own enumerable key at all, contribute nothing
 * and leave the channel open. `seen` holds the object literals currently being walked, so a cyclic
 * definition (`const a = { ...a }`, or a mutually recursive pair) counts as unproven rather than
 * being walked forever.
 */
function spreadSettles(
  context: Rule.RuleContext,
  argument: estree.Node,
  seen: Set<estree.Node>,
): Settlement {
  const value = resolveValue(context, argument);
  if (CARRIES_NO_NAMED_PROP.has(value.type)) {
    return null;
  }
  if (value.type !== 'ObjectExpression' || seen.has(value)) {
    return false;
  }
  seen.add(value);
  const settlement = objectSettles(context, value, seen);
  seen.delete(value);
  return settlement;
}

/**
 * How the object literal `object` settles the content channel.
 *
 * Members are scanned from last to first because the last member supplying a prop wins. Scanning in
 * that order is what keeps a nested spread from being ignored: it is reached, and settles the
 * channel, before any explicit property it could override (`{ children: 'T', ...props }`). An
 * explicit property placed after every spread settles the channel itself, since no spread can
 * override it (`{ ...props, children: 'T' }`).
 *
 * A computed property whose key cannot be read as a literal is treated like an unresolved spread:
 * its name is unknown, so it might be `children` and override an earlier value. It settles the
 * channel as unproven instead of being skipped, the same way `{ children: 'T', ...props }` does.
 */
function objectSettles(
  context: Rule.RuleContext,
  object: estree.ObjectExpression,
  seen: Set<estree.Node>,
): Settlement {
  for (let i = object.properties.length - 1; i >= 0; i--) {
    const element = object.properties[i];
    if (isContentProperty(element)) {
      return !rendersNothing(context, element.value);
    }
    if (element.type === 'SpreadElement') {
      const settlement = spreadSettles(context, element.argument, seen);
      if (settlement !== null) {
        return settlement;
      }
    } else if (element.computed && !isStringLiteral(element.key)) {
      return false;
    }
  }
  return null;
}

/**
 * Whether the spread attributes of the element provably supply `children` with something that
 * renders.
 *
 * Attributes are scanned from last to first because the last attribute supplying a prop wins; the
 * first spread that settles the channel therefore decides it and earlier spreads are irrelevant.
 */
function spreadProvesContent(
  context: Rule.RuleContext,
  attributes: TSESTree.JSXOpeningElement['attributes'],
): boolean {
  for (let i = attributes.length - 1; i >= 0; i--) {
    const attribute = attributes[i];
    if (attribute.type !== 'JSXSpreadAttribute') {
      continue;
    }
    const settlement = spreadSettles(
      context,
      attribute.argument as unknown as estree.Node,
      new Set<estree.Node>(),
    );
    if (settlement !== null) {
      return settlement;
    }
  }
  return false;
}

/**
 * Whether a spread attribute provably gives this heading content.
 *
 * JSX children, when present, override `props.children`, so a heading that already has a child
 * cannot be rescued by a spread. Every child that can still be present on an intercepted report is
 * one the JSX transform keeps (upstream returns early for any `JSXText`, for a comment-only
 * expression container and for non-identifier expression containers), so the plain emptiness check
 * is exact here.
 */
function hasContentThroughSpread(context: Rule.RuleContext, reported: estree.Node): boolean {
  const element = reported as unknown as TSESTree.Node;
  if (element.type !== 'JSXOpeningElement' || element.parent.children.length > 0) {
    return false;
  }
  return spreadProvesContent(context, element.attributes);
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor && hasContentThroughSpread(context, reportDescriptor.node)) {
        return;
      }
      context.report({ ...reportDescriptor });
    },
  );
}
