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
// https://sonarsource.github.io/rspec/#/rspec/S5256/javascript

import estree from 'estree';
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import pkg from 'jsx-ast-utils';
const { getLiteralPropValue, getProp } = pkg;

import { computeGrid } from '../helpers/table.js';
import { generateMeta, isPresentationTable, getElementType } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData),
  create(context: Rule.RuleContext) {
    const checkValidTable = (tree: TSESTree.JSXElement): boolean => {
      const grid = computeGrid(context, tree);
      if (grid === null) {
        // Unknown table structure, dont raise issue
        return true;
      }
      if (grid.length === 0) {
        return false;
      }
      for (const row of grid) {
        if (row.every(({ isHeader }) => isHeader)) {
          return true;
        }
      }
      for (let col = 0; col < grid[0].length; col++) {
        if (grid.every(row => col >= row.length || row[col].isHeader)) {
          return true;
        }
      }
      return false;
    };
    return {
      JSXElement(node: estree.Node) {
        const tree = node as unknown as TSESTree.JSXElement;
        const elementType = getElementType(context)(tree.openingElement);
        if (elementType === 'table') {
          if (isPresentationTable(context, tree.openingElement)) {
            return;
          }
          const ariaHidden = getProp(tree.openingElement.attributes, 'aria-hidden');
          if (ariaHidden && getLiteralPropValue(ariaHidden) === true) {
            return;
          }
          if (!checkValidTable(tree)) {
            context.report({
              node,
              message: 'Add a valid header row or column to this "<table>".',
            });
          }
        }
      },
    };
  },
};
