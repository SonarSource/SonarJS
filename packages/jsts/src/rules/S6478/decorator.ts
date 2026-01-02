/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6478/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  functionLike,
  generateMeta,
  getMainFunctionTokenLocation,
  interceptReportForReact,
  RuleContext,
} from '../helpers/index.js';
import type { TSESTree } from '@typescript-eslint/utils';
import * as meta from './generated-meta.js';

/**
 * Known react-intl component names that accept a `values` prop
 * with rich text formatting functions.
 */
const REACT_INTL_COMPONENTS = new Set([
  'FormattedMessage',
  'FormattedHTMLMessage',
  'FormattedPlural',
  '$t', // common alias
]);

/**
 * Checks if a JSXExpressionContainer is the `values` attribute of a react-intl component.
 */
function isReactIntlValuesAttribute(container: TSESTree.JSXExpressionContainer): boolean {
  const jsxAttribute = container.parent;
  if (jsxAttribute?.type !== 'JSXAttribute') {
    return false;
  }

  const attrName = jsxAttribute.name;
  if (attrName.type !== 'JSXIdentifier' || attrName.name !== 'values') {
    return false;
  }

  const jsxOpeningElement = jsxAttribute.parent;
  if (jsxOpeningElement?.type !== 'JSXOpeningElement') {
    return false;
  }

  const elementName = jsxOpeningElement.name;
  return elementName.type === 'JSXIdentifier' && REACT_INTL_COMPONENTS.has(elementName.name);
}

/**
 * Checks if a CallExpression is a call to `intl.formatMessage(descriptor, values)`
 * and the objectExpr is the second argument (values).
 */
function isFormatMessageCall(
  callExpr: TSESTree.CallExpression,
  objectExpr: TSESTree.ObjectExpression,
): boolean {
  // Check if the object is the second argument
  if (callExpr.arguments.length < 2 || callExpr.arguments[1] !== objectExpr) {
    return false;
  }

  // Check if the callee is a member expression like `intl.formatMessage`
  const callee = callExpr.callee;
  if (callee.type !== 'MemberExpression') {
    return false;
  }

  // Check if the method name is `formatMessage`
  const property = callee.property;
  return property.type === 'Identifier' && property.name === 'formatMessage';
}

/**
 * Checks if a node is a function used as a react-intl rich text formatting value.
 * These are render callbacks, not React components, and should not be flagged.
 *
 * Supports two patterns:
 * 1. JSX: <FormattedMessage values={{ b: chunks => <b>{chunks}</b> }} />
 * 2. Hook: intl.formatMessage(descriptor, { b: chunks => <b>{chunks}</b> })
 */
function isReactIntlFormattingValue(node: estree.Node): boolean {
  if (node.type !== 'ArrowFunctionExpression' && node.type !== 'FunctionExpression') {
    return false;
  }

  const tsNode = node as TSESTree.Node;
  const property = tsNode.parent;
  if (property?.type !== 'Property') {
    return false;
  }

  const objectExpr = property.parent;
  if (objectExpr?.type !== 'ObjectExpression') {
    return false;
  }

  const container = objectExpr.parent;

  // Pattern 1: JSX <FormattedMessage values={{ ... }} />
  if (container?.type === 'JSXExpressionContainer') {
    return isReactIntlValuesAttribute(container);
  }

  // Pattern 2: intl.formatMessage(descriptor, { ... })
  if (container?.type === 'CallExpression') {
    return isFormatMessageCall(container, objectExpr);
  }

  return false;
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, report) => {
      const { node } = report as { node: estree.Node };

      // Skip functions used as react-intl rich text formatting values.
      // These are render callbacks, not React components.
      if (isReactIntlFormattingValue(node)) {
        return;
      }

      const message =
        'Move this component definition out of the parent component and pass data as props.';
      const loc = getMainNodeLocation(node, context);
      if (loc) {
        context.report({ ...report, loc, message });
      } else {
        context.report({ ...report, message });
      }
    },
  );

  function getMainNodeLocation(node: estree.Node, context: Rule.RuleContext) {
    /* class components */
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      if (node.id) {
        return node.id.loc;
      } else {
        return context.sourceCode.getFirstToken(node, token => token.value === 'class')?.loc;
      }
    }

    /* functional components */
    if (functionLike.has(node.type)) {
      const fun = node as unknown as TSESTree.FunctionLike;
      const ctx = context as unknown as RuleContext;
      return getMainFunctionTokenLocation(fun, fun.parent, ctx) as estree.SourceLocation;
    }

    /* should not happen */
    return node.loc;
  }
}
