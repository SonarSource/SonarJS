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
// https://sonarsource.github.io/rspec/#/rspec/S100/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { last } from '../utils';

interface FunctionKnowledge {
  returnsJSX: boolean;
  id: TSESTree.Node;
}

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      renameFunction:
        "Rename this '{{function}}' function to match the regular expression '{{format}}'.",
    },
  },
  create(context: Rule.RuleContext) {
    const functionStack: estree.Node[] = [];
    const functionKnowledge = new Map<estree.Node, FunctionKnowledge>();
    return {
      Property: (node: estree.Node) => {
        const prop = node as TSESTree.Property;
        if (isFunctionExpression(prop.value)) {
          checkName(prop.key);
        }
      },
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (node: estree.Node) => {
        functionStack.push(node);
        const knowledge = createKnowledge(node as TSESTree.Node);
        if (knowledge != null) {
          functionKnowledge.set(node, knowledge);
        }
      },
      'FunctionDeclaration,FunctionExpression,ArrowFunctionExpression:exit': (
        node: estree.Node,
      ) => {
        functionStack.pop();
        const knowledge = functionKnowledge.get(node);
        if (knowledge != null && !isReactFunctionComponent(knowledge)) {
          checkName(knowledge.id);
        }
      },
      ReturnStatement: (node: estree.Node) => {
        const returnStatement = node as estree.ReturnStatement;
        const knowledge = functionKnowledge.get(last(functionStack));
        if (
          knowledge &&
          returnStatement.argument &&
          (returnStatement.argument as any).type === 'JSXElement'
        ) {
          knowledge.returnsJSX = true;
        }
      },
      MethodDefinition: (node: estree.Node) => {
        const key = (node as TSESTree.MethodDefinition).key;
        checkName(key);
      },
    };

    function checkName(id: TSESTree.Node) {
      const [{ format }] = context.options;
      if (id.type === 'Identifier' && !id.name.match(format)) {
        context.report({
          messageId: 'renameFunction',
          data: {
            function: id.name,
            format,
          },
          node: id,
        });
      }
    }
  },
};

function isFunctionExpression(node: TSESTree.Node | null) {
  return node && (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression');
}

function isReactFunctionComponent(knowledge: FunctionKnowledge | null) {
  return knowledge !== null && nameStartsWithCapital(knowledge.id) && knowledge.returnsJSX;
}

function nameStartsWithCapital(node: TSESTree.Node) {
  return node.type === 'Identifier' && node.name[0] === node.name[0].toUpperCase();
}

function createKnowledge(node: TSESTree.Node): FunctionKnowledge | null {
  if (node.type === 'FunctionDeclaration' && node.id !== null) {
    return {
      returnsJSX: false,
      id: node.id,
    };
  }

  const parent = node.parent;
  if (parent?.type === 'VariableDeclarator') {
    return {
      returnsJSX: false,
      id: parent.id,
    };
  }

  return null;
}
