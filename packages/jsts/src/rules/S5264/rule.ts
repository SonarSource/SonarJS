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
// https://sonarsource.github.io/rspec/#/rspec/S5264/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, getElementType } from '../helpers/index.js';
import { meta } from './meta.js';
import pkg from 'jsx-ast-utils';
const { getLiteralPropValue, getProp, getPropValue } = pkg;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      addContent: 'Add an accessible content to this "<object>" tag.',
    },
  }),
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
            return child.expression.type !== 'JSXEmptyExpression';

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

const isHiddenFromScreenReader = (
  type: string,
  attributes: (TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute)[],
) => {
  if (type.toUpperCase() === 'INPUT') {
    const hidden = getLiteralPropValue(getProp(attributes, 'type'));

    if (typeof hidden === 'string' && hidden.toUpperCase?.() === 'HIDDEN') {
      return true;
    }
  }

  const ariaHidden = getPropValue(getProp(attributes, 'aria-hidden'));
  return ariaHidden === true;
};
