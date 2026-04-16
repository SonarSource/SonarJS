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
 * Returns true if the callee can accept more than one argument.
 * When signatures are unresolved (empty), returns true as a conservative fallback
 * to avoid false negatives. Single-argument callees with resolved signatures are
 * suppressed as false positives.
 */
function calleeAcceptsMultipleArguments(
  callee: TSESTree.Node,
  services: RequiredParserServices,
): boolean {
  const calleeType = getTypeFromTreeNode(callee as unknown as estree.Node, services);
  const signatures = calleeType.getCallSignatures();
  // If signatures cannot be resolved, fall back to reporting (conservative behavior)
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
