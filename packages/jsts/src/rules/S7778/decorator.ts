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
import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { isArray, getTypeFromTreeNode } from '../helpers/type.js';
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

  const { node } = descriptor;
  const tsNode = node as TSESTree.Node;

  // The unicorn rule reports either the callee Identifier (importScripts)
  // or the property Identifier (push, add, remove).
  // For importScripts, node.parent is a CallExpression directly.
  if (tsNode.parent?.type === 'CallExpression') {
    // importScripts: negligible risk of a user-written single-arg shadow; always report
    context.report(descriptor);
    return;
  }

  // For push/add/remove, node.parent is a MemberExpression (the callee)
  if (tsNode.parent?.type !== 'MemberExpression') {
    context.report(descriptor);
    return;
  }

  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    // No TypeScript type information available; pass through unchanged (conservative fallback)
    context.report(descriptor);
    return;
  }

  if (tsNode.type !== 'Identifier') {
    context.report(descriptor);
    return;
  }

  const identifier = tsNode as TSESTree.Identifier;
  const receiver = (tsNode.parent as TSESTree.MemberExpression).object as estree.Node;
  const methodName = identifier.name;

  if (methodName === 'push') {
    // Report only if receiver is an Array
    if (isArray(receiver, services)) {
      context.report(descriptor);
    }
    return;
  }

  // add or remove: report only if the receiver is a DOMTokenList
  const receiverType = getTypeFromTreeNode(receiver, services);
  if (receiverType.symbol?.name === 'DOMTokenList') {
    context.report(descriptor);
  }
}
