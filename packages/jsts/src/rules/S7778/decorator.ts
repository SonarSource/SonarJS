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
import ts from 'typescript';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import type { RequiredParserServices } from '../helpers/parser-services.js';
import { isArrayLikeType, getTypeFromTreeNode } from '../helpers/type.js';
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

  const identifier = tsNode as TSESTree.Identifier;
  const receiver = (tsNode.parent as TSESTree.MemberExpression).object as estree.Node;
  const methodName = identifier.name;
  const receiverType = getTypeFromTreeNode(receiver, services);

  // If the type is any/unknown, report (conservative fallback)
  if (receiverType.flags === ts.TypeFlags.Any || receiverType.flags === ts.TypeFlags.Unknown) {
    context.report(descriptor);
    return;
  }

  if (methodName === 'push') {
    // For push: report if receiver is array-like
    if (isArrayLikeType(receiverType, services)) {
      context.report(descriptor);
      return;
    }

    // For non-array receivers, only suppress if the push method accepts only one parameter
    if (methodHasSingleParameter(receiverType, 'push', services)) {
      // Suppress: it's a custom class with single-arg push
      return;
    }

    // Report: can't confirm it's a single-arg method, or it has multiple parameters
    context.report(descriptor);
    return;
  }

  // add or remove: check that the classList receiver is a DOMTokenList
  if (receiverType.symbol?.name === 'DOMTokenList') {
    context.report(descriptor);
    return;
  }

  // For non-DOMTokenList receivers, only suppress if the method accepts only one parameter
  if (methodHasSingleParameter(receiverType, methodName, services)) {
    // Suppress: it's a custom class with single-arg add/remove
    return;
  }

  // Report: can't confirm it's a single-arg method, or it has multiple parameters
  context.report(descriptor);
}

function methodHasSingleParameter(
  type: ts.Type,
  methodName: string,
  services: RequiredParserServices,
): boolean {
  const checker = services.program.getTypeChecker();
  const property = type.getProperty(methodName);

  if (!property) {
    return false;
  }

  const propType = checker.getTypeOfSymbolAtLocation(
    property,
    services.program.getSourceFiles()[0],
  );
  const signatures = propType.getCallSignatures();

  if (signatures.length === 0) {
    return false;
  }

  // Check if ALL signatures accept only one required parameter and no rest parameters
  return signatures.every(sig => {
    // Check for rest parameters - if any parameter is a rest parameter, it can accept multiple arguments
    for (const param of sig.parameters) {
      const declaration = param.valueDeclaration as ts.ParameterDeclaration | undefined;
      // If the parameter has a dotDotDotToken, it's a rest parameter and can accept multiple arguments
      if (declaration?.dotDotDotToken) {
        return false;
      }
    }

    // Count required parameters (those not optional or with default values)
    let requiredCount = 0;
    for (const param of sig.parameters) {
      // Check if the parameter is optional by examining its flags or declaration
      // A parameter is optional if it has the Optional flag or has a default value
      const isOptional = param.flags & ts.SymbolFlags.Optional;
      if (!isOptional) {
        requiredCount++;
      }
    }
    // Suppress only if all signatures require at most 1 parameter
    return requiredCount <= 1;
  });
}
