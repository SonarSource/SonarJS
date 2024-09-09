/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S7063/javascript

import { Rule } from 'eslint';
import { generateMeta } from '../helpers';
import { meta } from './meta';
import { Directive, ModuleDeclaration, Statement, Program, CallExpression } from 'estree';

const EXPORT_STATEMENTS = [
  'ExportNamedDeclaration',
  'ExportDefaultDeclaration',
  'ExportAllDeclaration',
];

const LOOP_STATEMENTS = [
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'DoWhileStatement',
  'WhileStatement',
];

const CONDITIONAL_STATEMENTS = ['IfStatement', 'SwitchStatement'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {}, false),
  create(context: Rule.RuleContext) {
    return {
      Program(node: Program) {
        if (!hasExport(node)) {
          return;
        }
        node.body.forEach(topLevelStatement => handleTopLevelStatement(context, topLevelStatement));
      },
    };
  },
};

function hasExport(program: Program): boolean {
  return program.body.filter(node => EXPORT_STATEMENTS.includes(node.type)).length > 0;
}

function handleTopLevelStatement(
  context: Rule.RuleContext,
  topLevelStatement: Directive | Statement | ModuleDeclaration,
) {
  if (LOOP_STATEMENTS.includes(topLevelStatement.type)) {
    context.report({
      message: 'Do not include loop statements on module top level',
      node: topLevelStatement,
    });
  } else if (CONDITIONAL_STATEMENTS.includes(topLevelStatement.type)) {
    context.report({
      message: 'Do not include conditional statements on module top level',
      node: topLevelStatement,
    });
  } else if (topLevelStatement.type === 'ExpressionStatement') {
    const expression = topLevelStatement.expression;
    if (expression.type === 'CallExpression' && !isRequireExpression(expression)) {
      context.report({
        message: 'Do not include method calls on module top level',
        node: topLevelStatement,
      });
    }
  }
}

function isRequireExpression(expression: CallExpression): boolean {
  return expression.callee.type === 'Identifier' && expression.callee.name === 'require';
}
