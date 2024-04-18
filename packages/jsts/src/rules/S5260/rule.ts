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
// https://sonarsource.github.io/rspec/#/rspec/S5260/javascript

import getElementType from 'eslint-plugin-jsx-a11y/lib/util/getElementType';
import * as estree from 'estree';
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import { computeGrid, TableCell } from '../helpers';

type BlockInfo = {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  cell: TableCell;
};

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      messageUnknownHeader: `id {{header}} in "headers" does not reference any <th> header`,
      messageInvalidHeader: `id {{header}} in "headers" references the header of another column/row`,
    },
  },
  create(context: Rule.RuleContext) {
    const verifyHeaderReferences = (tree: TSESTree.JSXElement) => {
      const grid = computeGrid(context, tree);
      if (grid === null || grid.length === 0) {
        return true;
      }
      const rowHeaders: Set<string>[] = Array.from({ length: grid.length }, (_, idx) => {
        const ids = grid[idx]
          .filter(({ isHeader, id }) => isHeader && id)
          .map(({ id }) => id) as string[];
        return new Set<string>(ids);
      });
      const colHeaders: Set<string>[] = Array.from({ length: grid[0].length }, (_, idx) => {
        const ids = grid
          .map(row => row[idx])
          .filter(cell => cell)
          .filter(({ isHeader, id }) => isHeader && id)
          .map(({ id }) => id) as string[];
        return new Set<string>(ids);
      });
      const allHeaders = new Set([
        ...rowHeaders.reduce((headers, acc) => new Set([...headers, ...acc]), new Set()),
        ...colHeaders.reduce((headers, acc) => new Set([...headers, ...acc]), new Set()),
      ]);

      const internalNodeToPositions = new Map<number, BlockInfo>();
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          const cell = grid[row][col];
          if (!cell.headers) {
            continue;
          }
          if (internalNodeToPositions.has(cell.internalNodeId)) {
            const oldValue = internalNodeToPositions.get(cell.internalNodeId)!;
            internalNodeToPositions.set(cell.internalNodeId, {
              ...oldValue,
              maxRow: row,
              maxCol: col,
            });
          } else {
            internalNodeToPositions.set(cell.internalNodeId, {
              minRow: row,
              maxRow: row,
              minCol: col,
              maxCol: col,
              cell,
            });
          }
        }
      }
      for (let { minRow, maxRow, minCol, maxCol, cell } of internalNodeToPositions.values()) {
        if (!cell.headers || cell.headers.length === 0) {
          continue;
        }
        const actualHeaders = [
          ...colHeaders.slice(minCol, maxCol + 1),
          ...rowHeaders.slice(minRow, maxRow + 1),
        ].reduce((headers, acc) => new Set([...headers, ...acc]), new Set());
        for (let header of cell.headers) {
          if (!actualHeaders.has(header)) {
            if (allHeaders.has(header)) {
              context.report({
                node: cell.node as unknown as estree.Node,
                messageId: 'messageInvalidHeader',
                data: {
                  id: header,
                },
              });
            } else {
              context.report({
                node: cell.node as unknown as estree.Node,
                messageId: 'messageUnknownHeader',
              });
            }
          }
        }
      }
    };
    // for (const [k, v] : internalNodeToPositions.entries()) {
    //   for (let header of cell.headers) {
    //     if (!rowHeaders[row].has(header) && !colHeaders[col].has(header)) {
    //       if (allHeaders.has(header)) {
    //         context.report({
    //           node: cell.node as unknown as estree.Node,
    //           messageId: 'messageInvalidHeader',
    //           data: {
    //             id: header,
    //           },
    //         });
    //       } else {
    //         context.report({
    //           node: cell.node as unknown as estree.Node,
    //           messageId: 'messageUnknownHeader',
    //         })
    //       }
    //     }
    //   }
    // }
    return {
      JSXElement(node: estree.Node) {
        const tree = node as unknown as TSESTree.JSXElement;
        const elementType = getElementType(context)(tree.openingElement);
        if (elementType === 'table') {
          verifyHeaderReferences(tree);
        }
      },
    };
  },
};
