/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import * as estree from 'estree';
import { Rule } from 'eslint';
import { suggestEmptyBlockQuickFix } from '../S108/decorator';
import { interceptReport, FunctionNodeType, isFunctionNode, isIdentifier } from '../helpers';

type RuleFunctionNode = FunctionNodeType & Rule.Node;

function isRuleFunctionNode(node: estree.Node): node is RuleFunctionNode {
  return isFunctionNode(node) && 'parent' in node;
}

// core implementation of this rule does not provide quick fixes
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  return interceptReport(rule, reportWithQuickFixIfApplicable);
}

export function reportWithQuickFixIfApplicable(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
) {
  if (!('node' in reportDescriptor) || !isRuleFunctionNode(reportDescriptor.node)) {
    return;
  }

  const functionNode = reportDescriptor.node;
  if (isApplicable(functionNode)) {
    reportWithQuickFix(context, reportDescriptor, functionNode);
  }
}

// This function limits the issues to variable/function/method declarations which name is not like /^on[A-Z].
// Any lambda expression or arrow function is thus ignored.
function isApplicable(functionNode: RuleFunctionNode) {
  // Matches identifiers like onClick and more generally onXxx
  function isCallbackIdentifier(node: estree.Node | null) {
    return node !== null && isIdentifier(node) && /^on[A-Z]/.test(node.name);
  }

  // Matches: function foo() {}
  // But not: function onClose() {}
  function isFunctionDeclaration() {
    return functionNode.type === 'FunctionDeclaration' && !isCallbackIdentifier(functionNode.id);
  }

  // Matches: class A { foo() {} }
  // But not: class A { onClose() {} }
  function isMethodDefinition() {
    const methodNode = functionNode.parent;
    return (
      methodNode.type === 'MethodDefinition' &&
      methodNode.value === functionNode &&
      !isCallbackIdentifier(methodNode.key)
    );
  }

  // Matches: const foo = () => {};
  // But not: const onClose = () => {};
  function isVariableDeclarator() {
    const variableNode = functionNode.parent;
    return (
      variableNode.type === 'VariableDeclarator' &&
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
) {
  const name = reportDescriptor.data!.name;
  const openingBrace = context.sourceCode.getFirstToken(func.body)!;
  const closingBrace = context.sourceCode.getLastToken(func.body)!;
  suggestEmptyBlockQuickFix(context, reportDescriptor, name, openingBrace, closingBrace);
}
