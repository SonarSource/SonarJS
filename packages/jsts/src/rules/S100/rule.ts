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
// https://sonarsource.github.io/rspec/#/rspec/S100/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { last, functionLike } from '../helpers';

interface FunctionKnowledge {
  node: estree.Identifier;
  func: estree.Function;
  returnsJSX: boolean;
}

const functionExitSelector = [
  ':matches(',
  ['FunctionExpression', 'ArrowFunctionExpression', 'FunctionDeclaration'].join(','),
  ')',
  ':exit',
].join('');

const functionExpressionProperty = [
  'Property',
  '[key.type="Identifier"]',
  ':matches(',
  ['[value.type="FunctionExpression"]', '[value.type="ArrowFunctionExpression"]'].join(','),
  ')',
].join('');

const functionExpressionVariable = [
  'VariableDeclarator',
  '[id.type="Identifier"]',
  ':matches(',
  ['[init.type="FunctionExpression"]', '[init.type="ArrowFunctionExpression"]'].join(','),
  ')',
].join('');

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      renameFunction:
        "Rename this '{{function}}' function to match the regular expression '{{format}}'.",
    },
  },
  create(context: Rule.RuleContext) {
    const [{ format }] = context.options;
    const knowledgeStack: FunctionKnowledge[] = [];
    return {
      [functionExpressionProperty]: (node: estree.Property) => {
        knowledgeStack.push({
          node: node.key as estree.Identifier,
          func: node.value as estree.Function,
          returnsJSX: returnsJSX(node.value as estree.Function),
        });
      },
      [functionExpressionVariable]: (node: estree.VariableDeclarator) => {
        knowledgeStack.push({
          node: node.id as estree.Identifier,
          func: node.init as estree.Function,
          returnsJSX: returnsJSX(node.init as estree.Function),
        });
      },
      'MethodDefinition[key.type="Identifier"]': (node: estree.MethodDefinition) => {
        knowledgeStack.push({
          node: node.key as estree.Identifier,
          func: node.value as estree.Function,
          returnsJSX: false,
        });
      },
      'FunctionDeclaration[id.type="Identifier"]': (node: estree.FunctionDeclaration) => {
        knowledgeStack.push({
          node: node.id as estree.Identifier,
          func: node as estree.Function,
          returnsJSX: false,
        });
      },
      [functionExitSelector]: (func: estree.Function) => {
        if (func === last(knowledgeStack)?.func) {
          const knowledge = knowledgeStack.pop();
          if (knowledge && !knowledge.returnsJSX) {
            const { node } = knowledge;
            if (!node.name.match(format)) {
              context.report({
                messageId: 'renameFunction',
                data: {
                  function: node.name,
                  format,
                },
                node,
              });
            }
          }
        }
      },
      ReturnStatement: (node: estree.ReturnStatement) => {
        const knowledge = last(knowledgeStack);
        const ancestors = context.getAncestors();

        for (let i = ancestors.length - 1; i >= 0; i--) {
          if (functionLike.has(ancestors[i].type)) {
            const enclosingFunction = ancestors[i];
            if (
              knowledge &&
              knowledge.func === enclosingFunction &&
              node.argument &&
              (node.argument as any).type.startsWith('JSX')
            ) {
              knowledge.returnsJSX = true;
            }
            return;
          }
        }
      },
    };
  },
};

//handling arrow functions without return statement
function returnsJSX(node: estree.Function) {
  return (node.body as any).type.startsWith('JSX');
}
