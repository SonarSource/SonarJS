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
import ts from 'typescript';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import { getTypeFromTreeNode } from '../helpers/type.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    reportExempting,
  );
}

function reportExempting(context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
  if (!('node' in descriptor)) {
    context.report(descriptor);
    return;
  }

  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    // No TypeScript type information available; pass through unchanged (conservative fallback)
    context.report(descriptor);
    return;
  }

  const { node } = descriptor;
  const tsNode = node as TSESTree.Node;
  const parent = tsNode.parent;

  // Determine the callee node whose call signatures we'll inspect:
  // - method call (push, add, remove): the MemberExpression is the callee
  // - direct function call (importScripts): the reported Identifier is the callee
  let callee: TSESTree.Node;
  if (parent?.type === 'MemberExpression') {
    callee = parent;
  } else if (parent?.type === 'CallExpression') {
    callee = tsNode;
  } else {
    context.report(descriptor);
    return;
  }

  if (calleeAcceptsMultipleArguments(callee, services)) {
    context.report(descriptor);
  }
}

/**
 * Returns true if the callee accepts more than one argument — either via a rest
 * parameter or multiple parameters. Returns false when the callee type is `any`
 * (unknown type — prefer no issue over false positive) or when type resolution
 * confirms the callee accepts at most one argument. For other unresolved cases
 * (empty signatures but non-any type), falls back to reporting to avoid false
 * negatives on genuine combinable patterns.
 */
function calleeAcceptsMultipleArguments(
  callee: TSESTree.Node,
  services: RequiredParserServices,
): boolean {
  const calleeNode = callee as estree.Node;
  const calleeType = getTypeFromTreeNode(calleeNode, services);
  // If the callee type is 'any', type information is unavailable.
  // Per "prefer no issue over false positive", suppress the report.
  if (calleeType.flags & ts.TypeFlags.Any) {
    return false;
  }
  const signatures = calleeType.getCallSignatures();
  // If signatures are unresolved (but type is not 'any'), fall back to reporting
  // to preserve upstream behavior and avoid false negatives.
  if (signatures.length === 0) {
    return true;
  }
  return signatures.some(sig => {
    const params = sig.parameters;
    const lastParam = params.at(-1);
    if (lastParam === undefined) {
      return false;
    }
    const decl = lastParam.valueDeclaration;
    return (
      (decl !== undefined && ts.isParameter(decl) && !!decl.dotDotDotToken) || params.length > 1
    );
  });
}
