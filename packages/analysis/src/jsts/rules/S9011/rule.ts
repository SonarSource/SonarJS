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
import { rules as reactRules } from '../external/react.js';
import { rules as vueRules } from '../external/vue.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport, interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { mergeRules } from '../helpers/decorators/merger.js';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import * as meta from './generated-meta.js';

const reactBaseRule = reactRules['button-has-type'];
const vueBaseRule = vueRules['html-button-has-type'];

const MISSING_TYPE_MESSAGE = 'Add an explicit "type" attribute to this button.';
const VALID_BUTTON_TYPES = new Set(['button', 'submit', 'reset']);

function invalidTypeMessage(value: string) {
  return `Replace this invalid "type" value "${value}" with one of "button", "submit", or "reset".`;
}

/**
 * A missing (or effectively missing, e.g. empty) type is only flagged for buttons
 * literally nested inside a `<form>`: that's the only case where it can actually cause
 * an unintended submission. An explicit-but-invalid type is always flagged, form or no
 * form, since that's a mistake regardless of context.
 *
 * This accepts false negatives for buttons rendered by a custom component that itself
 * sits inside a form, since that composition can't be resolved statically.
 */
function isInsideReactForm(node: unknown): boolean {
  return (
    findFirstMatchingAncestor(
      node as TSESTree.Node,
      ancestor =>
        ancestor.type === 'JSXElement' &&
        ancestor.openingElement.name.type === 'JSXIdentifier' &&
        ancestor.openingElement.name.name === 'form',
    ) !== undefined
  );
}

function isInsideVueForm(node: unknown): boolean {
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
      const { value } = data as { value: string };
      // React reports an empty type="" as an "invalid value" rather than a missing
      // one; treat it like a missing type (form-scoped) rather than a validated one.
      if (value === '') {
        if (isInsideForm(node)) {
          context.report({ ...rest, message: MISSING_TYPE_MESSAGE });
        }
        return;
      }
      // The HTML type attribute is an enumerated attribute, matched ASCII
      // case-insensitively, so `type="Submit"` is spec-valid - but both base rules
      // compare case-sensitively and treat it as invalid.
      if (VALID_BUTTON_TYPES.has(value.toLowerCase())) {
        return;
      }
      // An explicit-but-wrong type is always worth flagging, in or out of a form.
      context.report({ ...rest, message: invalidTypeMessage(value) });
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

function checkVueTypeBinding(context: Rule.RuleContext, node: AST.VElement) {
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
    if (!VALID_BUTTON_TYPES.has(value.toLowerCase())) {
      context.report({
        node: expression as unknown as estree.Node,
        message: invalidTypeMessage(value),
      });
    }
  }
}

const reactRule = interceptReportForReact(reactBaseRule, createOnReport(isInsideReactForm));
const vueRule = interceptReport(vueBaseRule, createOnReport(isInsideVueForm));

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      ...reactBaseRule.meta?.messages,
      ...vueBaseRule.meta?.messages,
    },
  }),
  create(context: Rule.RuleContext) {
    const listeners = mergeRules(reactRule.create(context), vueRule.create(context));
    const parserServices = context.sourceCode.parserServices;
    if (!parserServices?.defineTemplateBodyVisitor) {
      return listeners;
    }
    return mergeRules(
      listeners,
      parserServices.defineTemplateBodyVisitor({
        "VElement[rawName='button']": (node: AST.VElement) => checkVueTypeBinding(context, node),
      }),
    );
  },
};
