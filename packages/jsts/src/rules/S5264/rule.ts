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
// https://sonarsource.github.io/rspec/#/rspec/S5264/javascript

import { Rule } from 'eslint';
import isHiddenFromScreenReader from 'eslint-plugin-jsx-a11y/lib/util/isHiddenFromScreenReader';
import getElementType from 'eslint-plugin-jsx-a11y/lib/util/getElementType';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      addContent: 'Add an accessible content to this "<object>" tag.',
    },
  },
  create(context: Rule.RuleContext) {
    const elementType = getElementType(context);

    function hasVisibleChildren(children: TSESTree.JSXChild[]): boolean {
      return children.some((child: TSESTree.JSXChild) => {
        switch (child.type) {
          case 'JSXText':
            return !!child.value.trim();
          case 'JSXFragment':
            return hasVisibleChildren(child.children);
          case 'JSXElement':
            return !isHiddenFromScreenReader(
              elementType(child.openingElement),
              child.openingElement.attributes,
            );
          case 'JSXExpressionContainer':
            if (child.expression.type === 'Identifier') {
              return child.expression.name !== 'undefined';
            }
            return true;
          default:
            return false;
        }
      });
    }

    return {
      JSXElement(node: estree.Node) {
        const jsxNode = node as unknown as TSESTree.JSXElement;
        const type = elementType(jsxNode.openingElement);
        if (type.toLowerCase() !== 'object') {
          return;
        }

        if (!hasVisibleChildren(jsxNode.children)) {
          context.report({
            node,
            messageId: 'addContent',
          });
        }
      },
    };
  },
};
