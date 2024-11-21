/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1186/javascript

import estree from 'estree';
import { AST, Rule } from 'eslint';
import {
  FunctionNodeType,
  generateMeta,
  interceptReport,
  isFunctionNode,
  isIdentifier,
} from '../helpers/index.js';
import { meta } from './meta.js';

type RuleFunctionNode = FunctionNodeType & Rule.Node;

function isRuleFunctionNode(node: estree.Node): node is RuleFunctionNode {
  return isFunctionNode(node) && 'parent' in node;
}

// core implementation of this rule does not provide quick fixes
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, {
        ...rule.meta!,
        hasSuggestions: true,
      }),
    },
    reportWithQuickFixIfApplicable,
  );
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
  // Matches identifiers like onClick and more generally onXxx as well as XXXnoopXXX functions
  function isExceptionalName(node: estree.Node | null) {
    return (
      node !== null && isIdentifier(node) && (/^on[A-Z]/.test(node.name) || /noop/i.test(node.name))
    );
  }
  // Matches: function foo() {}
  // But not: function onClose() {} or function XXXnoopXXX() {}
  function isFunctionDeclaration() {
    return functionNode.type === 'FunctionDeclaration' && !isExceptionalName(functionNode.id);
  }

  // Matches: class A { foo() {} }
  // But not: class A { onClose() {} }
  function isMethodDefinition() {
    const methodNode = functionNode.parent;
    return (
      methodNode.type === 'MethodDefinition' &&
      methodNode.value === functionNode &&
      !isExceptionalName(methodNode.key)
    );
  }

  // Matches: const foo = () => {};
  // But not: const onClose = () => {};
  function isVariableDeclarator() {
    const variableNode = functionNode.parent;
    return (
      variableNode.type === 'VariableDeclarator' &&
      variableNode.init === functionNode &&
      !isExceptionalName(variableNode.id)
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

function suggestEmptyBlockQuickFix(
  context: Rule.RuleContext,
  descriptor: Rule.ReportDescriptor,
  blockType: string,
  openingBrace: AST.Token,
  closingBrace: AST.Token,
) {
  let commentPlaceholder: string;
  if (openingBrace.loc.start.line === closingBrace.loc.start.line) {
    commentPlaceholder = ` /* TODO document why this ${blockType} is empty */ `;
  } else {
    const columnOffset = closingBrace.loc.start.column;
    const padding = ' '.repeat(columnOffset);
    commentPlaceholder = `\n${padding}  // TODO document why this ${blockType} is empty\n${padding}`;
  }
  context.report({
    ...descriptor,
    suggest: [
      {
        desc: 'Insert placeholder comment',
        fix: fixer => fixer.insertTextAfter(openingBrace, commentPlaceholder),
      },
    ],
  });
}
