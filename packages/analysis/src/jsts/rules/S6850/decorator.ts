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
  getProperty,
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
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
 * Whether the spread attributes of the element may supply `prop` with something that renders.
 *
 * Attributes are scanned from last to first because the last attribute supplying a prop wins; the
 * first spread that settles `prop` therefore decides the channel and earlier spreads are irrelevant.
 * A spread whose argument cannot be resolved to a shape we understand, or a resolved object holding
 * an unresolved nested spread, is treated as possibly supplying content (documented uncertainty
 * policy of JS-2539). Note that one such spread makes every channel unknown at once.
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
    // Follow TS wrappers and single-write aliases; the walker carries its own cycle guard.
    const spreadValue = getUniqueWriteUsageOrNode(
      context,
      unwrapTypeScriptExpression(attribute.argument as unknown as estree.Node),
      true,
    );
    if (CARRIES_NO_NAMED_PROP.has(spreadValue.type)) {
      continue;
    }
    if (spreadValue.type !== 'ObjectExpression') {
      return true;
    }
    const property = getProperty(spreadValue, prop, context);
    if (property === undefined) {
      return true;
    }
    if (property !== null) {
      return !rendersNothing(context, property.value);
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
