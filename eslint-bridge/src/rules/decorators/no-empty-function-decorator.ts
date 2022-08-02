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

import estree from 'estree';
import { Rule } from 'eslint';
import { FunctionNodeType, interceptReport, isFunctionNode, isIdentifier } from '../../utils';
import { suggestEmptyBlockQuickFix } from './no-empty-decorator';

// core implementation of this rule does not provide quick fixes
export function decorateNoEmptyFunction(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  return interceptReport(rule, reportWithQuickFixIfApplicable);
}

function reportWithQuickFixIfApplicable(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
) {
  if (!('node' in reportDescriptor) || !isFunctionNode(reportDescriptor.node)) {
    return;
  }

  const functionNode = reportDescriptor.node;
  if (isApplicable(context, functionNode)) {
    reportWithQuickFix(context, reportDescriptor, functionNode);
  }
}

// This function limits the issues to variable/function/method declarations which name is not like /^on[A-Z].
// Any lambda expression or arrow function is thus ignored.
function isApplicable(context: Rule.RuleContext, functionNode: FunctionNodeType): boolean {
  // Matches identifiers like onClick and more generally onXxx
  function isCallbackIdentifier(node: estree.Node | null): boolean {
    return node !== null && isIdentifier(node) && /^on[A-Z]/.test(node.name);
  }

  // Matches: function foo() {}
  // But not: function onClose() {}
  function isFunctionDeclaration(): boolean {
    return functionNode.type === 'FunctionDeclaration' && !isCallbackIdentifier(functionNode.id);
  }

  // Matches: Class A { foo() {} }
  // But not: Class A { onClose() {} }
  function isMethodDefinition(): boolean {
    const [methodNode] = context.getAncestors().reverse();
    return (
      methodNode?.type === 'MethodDefinition' &&
      methodNode.value === functionNode &&
      !isCallbackIdentifier(methodNode.key)
    );
  }

  // Matches: const foo = () => {};
  // But not: const onClose = () => {};
  function isVariableDeclarator(): boolean {
    const [variableNode] = context.getAncestors().reverse();
    return (
      variableNode?.type === 'VariableDeclarator' &&
      variableNode.init === functionNode &&
      !isCallbackIdentifier(variableNode.id)
    );
  }

  return isFunctionDeclaration() || isMethodDefinition() || isVariableDeclarator();
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
