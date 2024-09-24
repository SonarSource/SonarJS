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
// https://sonarsource.github.io/rspec/#/rspec/S2077/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, isMemberWithProperty, isRequireModule } from '../helpers/index.ts';
import { meta } from './meta.ts';

const dbModules = ['pg', 'mysql', 'mysql2', 'sequelize'];

type Argument = estree.Expression | estree.SpreadElement;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      safeQuery: `Make sure that executing SQL queries is safe here.`,
    },
  }),
  create(context: Rule.RuleContext) {
    let isDbModuleImported = false;

    return {
      Program() {
        // init flag for each file
        isDbModuleImported = false;
      },

      ImportDeclaration(node: estree.Node) {
        const { source } = node as estree.ImportDeclaration;
        if (dbModules.includes(String(source.value))) {
          isDbModuleImported = true;
        }
      },

      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee, arguments: args } = call;

        if (isRequireModule(call, ...dbModules)) {
          isDbModuleImported = true;
          return;
        }

        if (
          isDbModuleImported &&
          isMemberWithProperty(callee, 'query') &&
          isQuestionable(args[0])
        ) {
          context.report({
            messageId: 'safeQuery',
            node: callee,
          });
        }
      },
    };
  },
};

function isQuestionable(sqlQuery: Argument | undefined) {
  if (!sqlQuery) {
    return false;
  }
  if (isTemplateWithVar(sqlQuery)) {
    return true;
  }
  if (isConcatenation(sqlQuery)) {
    return isVariableConcat(sqlQuery);
  }
  return (
    sqlQuery.type === 'CallExpression' && isMemberWithProperty(sqlQuery.callee, 'concat', 'replace')
  );
}

function isVariableConcat(node: estree.BinaryExpression): boolean {
  const { left, right } = node;
  if (!isHardcodedLiteral(right)) {
    return true;
  }
  if (isConcatenation(left)) {
    return isVariableConcat(left);
  }
  return !isHardcodedLiteral(left);
}

function isTemplateWithVar(node: estree.Node) {
  return node.type === 'TemplateLiteral' && node.expressions.length !== 0;
}

function isTemplateWithoutVar(node: estree.Node) {
  return node.type === 'TemplateLiteral' && node.expressions.length === 0;
}

function isConcatenation(node: estree.Node): node is estree.BinaryExpression {
  return node.type === 'BinaryExpression' && node.operator === '+';
}

function isHardcodedLiteral(node: estree.Node) {
  return node.type === 'Literal' || isTemplateWithoutVar(node);
}
