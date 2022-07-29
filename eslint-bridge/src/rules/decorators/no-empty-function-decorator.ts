/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S1186/javascript

import { Rule } from 'eslint';
import { FunctionNodeType, interceptReport, isFunctionNode } from '../../utils';
import { suggestEmptyBlockQuickFix } from './no-empty-decorator';

// core implementation of this rule does not provide quick fixes
export function decorateNoEmptyFunction(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  return interceptReport(rule, reportWithQuickFixIfValid);
}

function reportWithQuickFixIfValid(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
) {
  if (!('node' in reportDescriptor) || !isFunctionNode(reportDescriptor.node)) {
    return;
  }

  const functionNode = reportDescriptor.node;
  if (!isException(context, functionNode)) {
    reportWithQuickFix(context, reportDescriptor, functionNode);
  }
}

function isException(context: Rule.RuleContext, functionNode: FunctionNodeType): boolean {
  return !isWhitelisted(context, functionNode) && isBlacklisted(functionNode);
}

function isWhitelisted(context: Rule.RuleContext, functionNode: FunctionNodeType): boolean {
  return (
    isFunctionDeclaration(functionNode) ||
    isMethodDeclaration(context, functionNode) ||
    isFunctionProperty(context, functionNode)
  );
}

function isFunctionDeclaration(functionNode: FunctionNodeType): boolean {
  return functionNode.type === 'FunctionDeclaration';
}

function isMethodDeclaration(context: Rule.RuleContext, functionNode: FunctionNodeType): boolean {
  const [_, methodNode] = context.getAncestors().reverse();
  return methodNode?.type === 'MethodDefinition' && methodNode?.value === functionNode;
}

function isFunctionProperty(context: Rule.RuleContext, functionNode: FunctionNodeType): boolean {
  const [_, propertyNode, objectNode] = context.getAncestors().reverse();
  return (
    objectNode?.type === 'ObjectExpression' &&
    propertyNode?.type === 'Property' &&
    propertyNode?.value === functionNode
  );
}

function isBlacklisted(node: FunctionNodeType): boolean {
  return node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression';
}

function reportWithQuickFix(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
  func: FunctionNodeType,
): void {
  const name = reportDescriptor.data!.name;
  const openingBrace = context.getSourceCode().getFirstToken(func.body)!;
  const closingBrace = context.getSourceCode().getLastToken(func.body)!;
  suggestEmptyBlockQuickFix(context, reportDescriptor, name, openingBrace, closingBrace);
}
