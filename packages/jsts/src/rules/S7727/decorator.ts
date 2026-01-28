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
// https://sonarsource.github.io/rspec/#/rspec/S7727/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  getParent,
  getFunctionParameterCount,
  getTypeFromTreeNode,
  interceptReport,
  isArrayLikeType,
  isRequiredParserServices,
  RequiredParserServices,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the unicorn/no-array-callback-reference rule to only report
 * when the callback function has multiple parameters.
 *
 * The rationale is that passing a single-parameter function to iterator methods
 * is safe because extra arguments (index, array) are simply ignored.
 * The problem only occurs when the callback accepts multiple parameters,
 * as the iterator's extra arguments would unexpectedly populate them.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      return; // TEST: skip all issues to trigger ruling update
      const node = (reportDescriptor as { node?: estree.Node }).node;
      if (!node) {
        context.report(reportDescriptor);
        return;
      }

      const services = context.sourceCode.parserServices;
      if (!isRequiredParserServices(services)) {
        // Without type info, be conservative and don't report
        return;
      }

      // Check if the callee is actually an array-like type
      // This filters out false positives like tree.find(key) where tree is not an array
      if (!isCalleeArrayLike(node, context, services)) {
        return;
      }

      const paramCount = getCallbackParameterCount(node, services);

      // Report if the callback has more than 1 parameter, or if we can't determine
      // the param count (e.g., class constructors) but the callee is an array
      if (paramCount === null || paramCount > 1) {
        context.report(reportDescriptor);
      }
    },
  );
}

/**
 * Checks if the callee object (e.g., `arr` in `arr.map(fn)`) is an array-like type.
 */
function isCalleeArrayLike(
  node: estree.Node,
  context: Rule.RuleContext,
  services: RequiredParserServices,
): boolean {
  const callExpr = getParent(context, node);
  if (callExpr?.type !== 'CallExpression') {
    return false; // Can't determine, lets not raise
  }

  const callee = callExpr.callee;
  if (callee.type !== 'MemberExpression') {
    return false; // Can't determine, don't raise
  }

  const calleeObject = callee.object;
  const type = getTypeFromTreeNode(calleeObject, services);
  return isArrayLikeType(type, services);
}

/**
 * Gets the number of parameters for a callback function reference.
 * Returns null if the parameter count cannot be determined.
 *
 * Note: The base rule only reports on function references (Identifier, MemberExpression),
 * never on inline function expressions, so we don't need to handle those.
 */
function getCallbackParameterCount(
  node: estree.Node,
  services: RequiredParserServices,
): number | null {
  // Use type information to get parameter count for function references
  if (node.type === 'Identifier' || node.type === 'MemberExpression') {
    return getFunctionParameterCount(node, services);
  }

  return null;
}
