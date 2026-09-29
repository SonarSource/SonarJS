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
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isIdentifier,
  isStringLiteral,
  isUndefined,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import * as meta from './generated-meta.js';

/**
 * Upstream `jsx-a11y/heading-has-content` finds heading content in JSX children and in explicit
 * `children` / `dangerouslySetInnerHTML` attributes only. Its `jsx-ast-utils.hasProp` lookup runs
 * with `spreadStrict: true`, so a `{...props}` spread never counts as supplying a prop. The
 * forwarding idiom
 *
 *   function Heading({ className, ...props }) { return <h1 className={className} {...props} />; }
 *
 * is therefore reported even though the heading renders `props.children`.
 *
 * This decorator drops such a report when a spread may still supply content, and keeps it when the
 * content every spread can supply is locally provable to be absent or to render nothing.
 *
 * Because upstream bails out as soon as `hasAnyProp(attributes, CONTENT_PROPS)` matches, any report
 * reaching this decorator is on an element with no explicit `children` / `dangerouslySetInnerHTML`
 * attribute: only spreads can carry those props here.
 */

/** The content channels upstream itself recognises, in upstream's own order. */
const CONTENT_PROPS = ['children', 'dangerouslySetInnerHTML'];

/**
 * Literal values React renders as nothing. `0` is deliberately absent: React renders it as "0",
 * so `children: 0` is content even though upstream's own `!!child.value` would call it empty.
 */
const NOTHING_RENDERED = new Set<estree.Literal['value']>([null, false, '']);

/**
 * Spread arguments that provably contribute no named prop. Spreading a string or an array only
 * produces numeric index keys; spreading a number, a boolean, `null` or a regex produces no own
 * enumerable key at all. None of them can carry `children` or `dangerouslySetInnerHTML`, so such a
 * spread must not exempt the heading.
 */
const CARRIES_NO_NAMED_PROP = new Set(['Literal', 'TemplateLiteral', 'ArrayExpression']);

/**
 * Whether `value` provably renders nothing. Mirrors upstream's notion of inaccessible content in
 * `hasAccessibleChild` (falsy literals, and the identifier `undefined`). Anything that cannot be
 * resolved to one of those — an identifier, a call, a member expression, a JSX element — counts as
 * possible content, so the report is dropped rather than risking a false negative in the other
 * direction.
 */
function rendersNothing(context: Rule.RuleContext, value: estree.Node): boolean {
  const unwrapped = unwrapTypeScriptExpression(value);
  const literal = getValueOfExpression(context, unwrapped, 'Literal');
  return literal ? NOTHING_RENDERED.has(literal.value) : isUndefined(unwrapped);
}

/**
 * How a spread settles one content channel:
 * `true` it may supply content, `false` it provably supplies none, `null` it says nothing at all
 * and the search must continue with whatever applies earlier.
 */
type Settlement = boolean | null;

/** Whether `element` is a non-spread property keyed by `prop`. */
function isKeyedProperty(
  element: estree.Property | estree.SpreadElement,
  prop: string,
): element is estree.Property {
  return (
    element.type === 'Property' &&
    (isIdentifier(element.key, prop) ||
      (isStringLiteral(element.key) && element.key.value === prop))
  );
}

/**
 * How spreading `argument` settles `prop`.
 *
 * Anything we cannot resolve to an object literal may carry the prop, so it settles the channel as
 * possible content. Values that only ever produce numeric index keys, or no own enumerable key at
 * all, contribute nothing and leave the channel open. `seen` holds the object literals currently
 * being walked, so a cyclic definition (`const a = { ...a }`, or a mutually recursive pair) is
 * treated as unresolved rather than walked forever.
 */
function spreadSettles(
  context: Rule.RuleContext,
  argument: estree.Node,
  prop: string,
  seen: Set<estree.Node>,
): Settlement {
  // Follow TS wrappers and single-write aliases; the walker carries its own cycle guard.
  const value = getUniqueWriteUsageOrNode(context, unwrapTypeScriptExpression(argument), true);
  if (CARRIES_NO_NAMED_PROP.has(value.type)) {
    return null;
  }
  if (value.type !== 'ObjectExpression' || seen.has(value)) {
    return true;
  }
  seen.add(value);
  const settlement = objectSettles(context, value, prop, seen);
  seen.delete(value);
  return settlement;
}

/**
 * How the object literal `object` settles `prop`.
 *
 * Members are scanned from last to first because the last member supplying a prop wins. Scanning in
 * that order is what keeps an unresolved nested spread from being ignored: it is reached, and
 * settles the channel as possible content, before any explicit property it could override
 * (`{ children: null, ...props }`). An explicit property placed after every spread still settles
 * the channel itself, since no spread can override it (`{ ...props, children: null }`).
 */
function objectSettles(
  context: Rule.RuleContext,
  object: estree.ObjectExpression,
  prop: string,
  seen: Set<estree.Node>,
): Settlement {
  for (let i = object.properties.length - 1; i >= 0; i--) {
    const element = object.properties[i];
    if (isKeyedProperty(element, prop)) {
      return !rendersNothing(context, element.value);
    }
    if (element.type === 'SpreadElement') {
      const settlement = spreadSettles(context, element.argument, prop, seen);
      if (settlement !== null) {
        return settlement;
      }
    }
  }
  return null;
}

/**
 * Whether the spread attributes of the element may supply `prop` with something that renders.
 *
 * Attributes are scanned from last to first because the last attribute supplying a prop wins; the
 * first spread that settles `prop` therefore decides the channel and earlier spreads are irrelevant.
 * A spread whose argument cannot be resolved to a shape we understand, or a resolved object whose
 * effective value for `prop` an unresolved nested spread could still override, is treated as
 * possibly supplying content (documented uncertainty policy of JS-2539). Note that one such spread
 * makes every channel unknown at once.
 */
function spreadMaySupplyContent(
  context: Rule.RuleContext,
  attributes: TSESTree.JSXOpeningElement['attributes'],
  prop: string,
): boolean {
  for (let i = attributes.length - 1; i >= 0; i--) {
    const attribute = attributes[i];
    if (attribute.type !== 'JSXSpreadAttribute') {
      continue;
    }
    const settlement = spreadSettles(
      context,
      attribute.argument as unknown as estree.Node,
      prop,
      new Set<estree.Node>(),
    );
    if (settlement !== null) {
      return settlement;
    }
  }
  return false;
}

/**
 * Whether a spread attribute can still give this heading content.
 *
 * JSX children, when present, override `props.children`, so a heading that already has a child
 * cannot be rescued by a spread. Every child that can still be present on an intercepted report is
 * one the JSX transform keeps (upstream returns early for any `JSXText`, for `{/* comment *\/}` and
 * for non-identifier expression containers), so the plain emptiness check is exact here.
 */
function hasContentThroughSpread(context: Rule.RuleContext, reported: estree.Node): boolean {
  const element = reported as unknown as TSESTree.Node;
  if (element.type !== 'JSXOpeningElement' || element.parent.children.length > 0) {
    return false;
  }
  return CONTENT_PROPS.some(prop => spreadMaySupplyContent(context, element.attributes, prop));
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
