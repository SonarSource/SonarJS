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
// https://sonarsource.github.io/rspec/#/rspec/S9011/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { AST } from 'vue-eslint-parser';
import type { TSESTree } from '@typescript-eslint/utils';
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
import { rules as reactRules } from '../external/react.js';
import { rules as vueRules } from '../external/vue.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport, interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { mergeRules } from '../helpers/decorators/merger.js';
import { childrenOf, findFirstMatchingAncestor } from '../helpers/ancestor.js';
import * as meta from './generated-meta.js';

const { getProp, getLiteralPropValue } = pkg;

const reactBaseRule = reactRules['button-has-type'];
const vueBaseRule = vueRules['html-button-has-type'];

const MISSING_TYPE_MESSAGE = 'Add an explicit "type" attribute to this button.';
const VALID_BUTTON_TYPES = new Set(['button', 'submit', 'reset']);

function invalidTypeMessage(value: string) {
  return `Replace this invalid "type" value "${value}" with one of "button", "submit", or "reset".`;
}

function describeTypeValue(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return String(value);
  }
  if (value instanceof RegExp) {
    return value.toString();
  }
  return JSON.stringify(value) ?? '[unrepresentable value]';
}

/**
 * A missing (or effectively missing, e.g. empty) type is only flagged for buttons
 * associated with a `<form>`: that's the only case where it can actually cause an
 * unintended submission. A button is associated with a form either by being literally
 * nested inside one, or by referencing the form's id through its own `form` attribute
 * (HTML allows a button to submit a form it isn't nested in that way). An
 * explicit-but-invalid type is always flagged, form or no form, since that's a mistake
 * regardless of context.
 *
 * This accepts false negatives for buttons rendered by a custom component that itself
 * is associated with a form, since that composition can't be resolved statically.
 */
function getJsxAttributeStringValue(
  attributes: TSESTree.JSXOpeningElement['attributes'],
  name: string,
): string | undefined {
  const attribute = getProp(attributes as JSXOpeningElement['attributes'], name);
  if (!attribute) {
    return undefined;
  }
  const value = getLiteralPropValue(attribute as JSXAttribute);
  return typeof value === 'string' ? value : undefined;
}

function hasJsxAttribute(
  attributes: TSESTree.JSXOpeningElement['attributes'],
  name: string,
): boolean {
  return getProp(attributes as JSXOpeningElement['attributes'], name) !== undefined;
}

function isJsxElementNamed(node: TSESTree.Node, tagName: string): node is TSESTree.JSXElement {
  return (
    node.type === 'JSXElement' &&
    node.openingElement.name.type === 'JSXIdentifier' &&
    node.openingElement.name.name === tagName
  );
}

/**
 * Walks the whole file once looking for `<form id="...">` elements, so a button's own
 * `form="..."` attribute can be resolved against every form in the file regardless of
 * where each sits in the tree.
 *
 * This is source-file co-occurrence, not DOM reachability: a form and a button that can
 * never actually render together (e.g. mutually exclusive ternary/conditional branches)
 * are still treated as associated if their ids match. Ruling that out in general would
 * mean resolving arbitrary control flow (ternaries, `&&`, switches, early returns...),
 * which isn't worth the complexity here - the same "false negatives beyond literal
 * nesting" trade-off this rule already accepts elsewhere just runs in the other
 * direction for this specific approximation.
 */
function collectReactFormIds(context: Rule.RuleContext): Set<string> {
  const ids = new Set<string>();
  const visitorKeys = context.sourceCode.visitorKeys;
  const stack: estree.Node[] = [context.sourceCode.ast];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      break;
    }
    const node = current as unknown as TSESTree.Node;
    if (isJsxElementNamed(node, 'form')) {
      const id = getJsxAttributeStringValue(node.openingElement.attributes, 'id');
      if (id !== undefined) {
        ids.add(id);
      }
    }
    stack.push(...childrenOf(current, visitorKeys));
  }
  return ids;
}

function isInsideReactForm(node: unknown, formIds: Set<string>): boolean {
  const jsxNode = node as TSESTree.Node;
  if (
    jsxNode?.type === 'JSXElement' &&
    hasJsxAttribute(jsxNode.openingElement.attributes, 'form')
  ) {
    // An explicit `form` attribute always determines the button's owner form, per the
    // HTML form-association algorithm - even when it doesn't resolve to one, ancestor
    // nesting is irrelevant once it's set.
    const formId = getJsxAttributeStringValue(jsxNode.openingElement.attributes, 'form');
    return formId !== undefined && formIds.has(formId);
  }
  return (
    findFirstMatchingAncestor(jsxNode, ancestor => isJsxElementNamed(ancestor, 'form')) !==
    undefined
  );
}

function getVueAttributeStringValue(element: AST.VElement, name: string): string | undefined {
  const attributes = element.startTag.attributes;
  const staticAttribute = attributes.find(
    (attribute): attribute is AST.VAttribute => !attribute.directive && attribute.key.name === name,
  );
  if (staticAttribute) {
    return staticAttribute.value?.value;
  }
  const boundAttribute = attributes.find(
    (attribute): attribute is AST.VDirective =>
      attribute.directive &&
      attribute.key.name.name === 'bind' &&
      attribute.key.argument?.type === 'VIdentifier' &&
      attribute.key.argument.name === name,
  );
  const expression = boundAttribute?.value?.expression;
  if (expression?.type === 'Literal' && typeof expression.value === 'string') {
    return expression.value;
  }
  return undefined;
}

function hasVueAttribute(element: AST.VElement, name: string): boolean {
  return element.startTag.attributes.some(
    attribute =>
      (!attribute.directive && attribute.key.name === name) ||
      (attribute.directive &&
        attribute.key.name.name === 'bind' &&
        attribute.key.argument?.type === 'VIdentifier' &&
        attribute.key.argument.name === name),
  );
}

function getNearestVElement(node: AST.Node | undefined): AST.VElement | undefined {
  let current: AST.Node | null | undefined = node;
  while (current) {
    if (current.type === 'VElement') {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

/**
 * Walks the whole template once looking for `<form id="...">` elements, so a button's
 * own `form="..."` attribute (or bound `:form="'...'"`) can be resolved against every
 * form in the template regardless of where each sits in the tree.
 *
 * Same source-file-co-occurrence approximation as collectReactFormIds: a form and a
 * button that can never actually render together (e.g. `v-if`/`v-else` siblings) are
 * still treated as associated if their ids match. See that function's comment for why.
 */
function collectVueFormIds(context: Rule.RuleContext): Set<string> {
  const ids = new Set<string>();
  const templateBody = (context.sourceCode.ast as unknown as { templateBody?: AST.VElement })
    .templateBody;
  if (!templateBody) {
    return ids;
  }
  const stack: AST.VElement[] = [templateBody];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      break;
    }
    if (current.rawName === 'form') {
      const id = getVueAttributeStringValue(current, 'id');
      if (id !== undefined) {
        ids.add(id);
      }
    }
    for (const child of current.children) {
      if (child.type === 'VElement') {
        stack.push(child);
      }
    }
  }
  return ids;
}

function isInsideVueForm(node: unknown, formIds: Set<string>): boolean {
  const button = getNearestVElement(node as AST.Node | undefined);
  if (button && hasVueAttribute(button, 'form')) {
    // An explicit `form` attribute always determines the button's owner form, per the
    // HTML form-association algorithm - even when it doesn't resolve to one, ancestor
    // nesting is irrelevant once it's set.
    const formId = getVueAttributeStringValue(button, 'form');
    return formId !== undefined && formIds.has(formId);
  }
  let current = (node as AST.Node | undefined)?.parent;
  while (current) {
    if (current.type === 'VElement' && current.rawName === 'form') {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * messageId -> Sonar-standard message for the cases we keep.
 *
 * Both plugins also report a "forbidden value" case tied to their opinionated
 * button/submit/reset allow-toggles, and React additionally reports a "complex type"
 * case for dynamic type expressions. None of those are handled here on purpose: we
 * don't expose the toggles, and dynamic type expressions can't be judged statically,
 * so both are dropped to avoid false positives.
 */
const MISSING_TYPE_MESSAGE_IDS = new Set([
  'missingType', // react
  'missingTypeAttribute', // vue
  'emptyTypeAttribute', // vue: type="" or :type with no expression - as good as missing
]);
const INVALID_TYPE_MESSAGE_IDS = new Set([
  'invalidValue', // react
  'invalidTypeAttribute', // vue
]);

function createOnReport(isInsideForm: (node: unknown) => boolean) {
  return function onReport(context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) {
    if (!('messageId' in reportDescriptor)) {
      context.report(reportDescriptor);
      return;
    }
    const { messageId, data, ...rest } = reportDescriptor;
    const node = (rest as { node?: unknown }).node;
    if (MISSING_TYPE_MESSAGE_IDS.has(messageId)) {
      // A missing type is only a hazard when the button can trigger a form
      // submission, i.e. when it's inside a form.
      if (isInsideForm(node)) {
        context.report({ ...rest, message: MISSING_TYPE_MESSAGE });
      }
      return;
    }
    if (INVALID_TYPE_MESSAGE_IDS.has(messageId)) {
      const { value } = data as { value: unknown };
      // React reports an empty type="" as an "invalid value" rather than a missing
      // one; the same holds for `type={null}`, which React doesn't render at all.
      if (value === '' || value === null || value === undefined) {
        if (isInsideForm(node)) {
          context.report({ ...rest, message: MISSING_TYPE_MESSAGE });
        }
        return;
      }
      // A non-string type value (e.g. `type={42}`) is never a valid button type;
      // stringify it before comparing/reporting rather than assuming it's a string.
      const stringValue = typeof value === 'string' ? value : describeTypeValue(value);
      // The HTML type attribute is an enumerated attribute, matched ASCII
      // case-insensitively, so `type="Submit"` is spec-valid - but both base rules
      // compare case-sensitively and treat it as invalid.
      if (VALID_BUTTON_TYPES.has(stringValue.toLowerCase())) {
        return;
      }
      // An explicit-but-wrong type is always worth flagging, in or out of a form.
      context.report({ ...rest, message: invalidTypeMessage(stringValue) });
    }
  };
}

/**
 * Unlike the JSX `type={...}` case, eslint-plugin-vue's own directive check
 * (`:type="..."`) only verifies that the bound expression is non-empty; it never
 * evaluates it, so `:type="'action'"` and `:type="isSubmit ? 'submit' : 'action'"`
 * silently pass. Simple cases (string literals, and ternaries whose branches are
 * all string literals) can be evaluated statically, so we check those ourselves
 * here instead of relying on the base rule's report.
 */
function evaluateVueTypeLiterals(expression: AST.ESLintExpression): string[] | null {
  if (expression.type === 'Literal' && typeof expression.value === 'string') {
    return [expression.value];
  }
  if (expression.type === 'ConditionalExpression') {
    const consequent = evaluateVueTypeLiterals(expression.consequent as AST.ESLintExpression);
    const alternate = evaluateVueTypeLiterals(expression.alternate as AST.ESLintExpression);
    if (consequent && alternate) {
      return [...consequent, ...alternate];
    }
  }
  return null;
}

function checkVueTypeBinding(context: Rule.RuleContext, node: AST.VElement, formIds: Set<string>) {
  const attributes = node.startTag.attributes;
  const hasStaticTypeAttribute = attributes.some(
    attribute => !attribute.directive && attribute.key.name === 'type',
  );
  if (hasStaticTypeAttribute) {
    return;
  }
  const typeDirective = attributes.find(
    (attribute): attribute is AST.VDirective =>
      attribute.directive &&
      attribute.key.name.name === 'bind' &&
      attribute.key.argument?.type === 'VIdentifier' &&
      attribute.key.argument.name === 'type',
  );
  const expression = typeDirective?.value?.expression;
  if (!expression) {
    return;
  }
  const literals = evaluateVueTypeLiterals(expression as AST.ESLintExpression);
  for (const value of literals ?? []) {
    // An empty literal (e.g. `:type="''"`) is as good as missing, so it's form-scoped
    // like any other missing type rather than always flagged as an invalid value.
    if (value === '') {
      if (isInsideVueForm(node, formIds)) {
        context.report({
          node: expression as unknown as estree.Node,
          message: MISSING_TYPE_MESSAGE,
        });
      }
      continue;
    }
    if (!VALID_BUTTON_TYPES.has(value.toLowerCase())) {
      context.report({
        node: expression as unknown as estree.Node,
        message: invalidTypeMessage(value),
      });
    }
  }
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      ...reactBaseRule.meta?.messages,
      ...vueBaseRule.meta?.messages,
    },
  }),
  create(context: Rule.RuleContext) {
    // Collecting every `<form id="...">` in the file requires a full-tree walk, so it's
    // only done once, lazily, the first time a report actually needs to check it.
    let reactFormIds: Set<string> | undefined;
    const getReactFormIds = () => (reactFormIds ??= collectReactFormIds(context));
    let vueFormIds: Set<string> | undefined;
    const getVueFormIds = () => (vueFormIds ??= collectVueFormIds(context));

    const reactRule = interceptReportForReact(
      reactBaseRule,
      createOnReport(node => isInsideReactForm(node, getReactFormIds())),
    );
    const vueRule = interceptReport(
      vueBaseRule,
      createOnReport(node => isInsideVueForm(node, getVueFormIds())),
    );

    const listeners = mergeRules(reactRule.create(context), vueRule.create(context));
    const parserServices = context.sourceCode.parserServices;
    if (!parserServices?.defineTemplateBodyVisitor) {
      return listeners;
    }
    return mergeRules(
      listeners,
      parserServices.defineTemplateBodyVisitor({
        "VElement[rawName='button']": (node: AST.VElement) =>
          checkVueTypeBinding(context, node, getVueFormIds()),
      }),
    );
  },
};
