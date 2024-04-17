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
// https://sonarsource.github.io/rspec/#/rspec/S5256/javascript

import getElementType from 'eslint-plugin-jsx-a11y/lib/util/getElementType';
import * as estree from 'estree';
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import { getProp, getLiteralPropValue } from 'jsx-ast-utils';
import { isPresentationTable } from '../helpers';

export const rule: Rule.RuleModule = {
  meta: {},
  create(context: Rule.RuleContext) {
    const checkValidTable = (tree: TSESTree.JSXElement): boolean => {
      const grid = computeGrid(tree);
      if (grid.length === 0) {
        return false;
      }
      for (const row of grid) {
        if (row.every(isHeader => isHeader)) {
          return true;
        }
      }
      for (let col = 0; col < grid[0].length; col++) {
        if (grid.every(row => col >= row.length || row[col])) {
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

type TableCell = {
  rowSpan: number;
  isHeader: boolean;
};

function computeSpan(tree: TSESTree.JSXElement, spanKey: string): number {
  let span = 1;
  const spanAttr = getProp(tree.openingElement.attributes, spanKey);
  if (spanAttr) {
    span = parseInt(String(getLiteralPropValue(spanAttr)));
  }
  return span;
}

function rowSpan(tree: TSESTree.JSXElement): number {
  let value = computeSpan(tree, 'rowspan');
  const MAX_ROW_SPAN = 65534;
  if (value > MAX_ROW_SPAN) {
    value = MAX_ROW_SPAN;
  }
  return value;
}

function colSpan(tree: TSESTree.JSXElement): number {
  let value = computeSpan(tree, 'colspan');
  const MAX_INVALID_COL_SPAN = 10000;
  if (value > MAX_INVALID_COL_SPAN) {
    value = 1;
  }
  return value;
}

function extractRow(tree: TSESTree.JSXElement): TableCell[] {
  const row: TableCell[] = [];
  tree.children.forEach(child => {
    if (child.type !== 'JSXElement') {
      return;
    }
    const colSpanValue = colSpan(child);
    const rowSpanValue = rowSpan(child);
    for (let i = 0; i < colSpanValue; i++) {
      row.push({
        rowSpan: rowSpanValue,
        isHeader:
          child.openingElement.name.type === 'JSXIdentifier' &&
          child.openingElement.name.name === 'th',
      });
    }
  });
  return row;
}

function extractRows(tree: TSESTree.JSXElement): TableCell[][] {
  const rows: TableCell[][] = [];
  tree.children.forEach(child => {
    if (
      child.type === 'JSXElement' &&
      child.openingElement.name.type === 'JSXIdentifier' &&
      child.openingElement.name.name === 'tr'
    ) {
      rows.push(extractRow(child));
    } else if (child.type === 'JSXElement') {
      if (
        child.openingElement.name.type === 'JSXIdentifier' &&
        child.openingElement.name.name === 'table'
      ) {
        return;
      }
      const extractedRows = extractRows(child);
      if (extractedRows.length > 0) {
        rows.push(...extractedRows);
      }
    }
  });
  return rows;
}

function computeGrid(tree: TSESTree.JSXElement): boolean[][] {
  const rows = extractRows(tree);
  if (rows.length === 0) {
    return [];
  }
  const nbColumns = rows[0].length;
  const columns: (TableCell | undefined)[] = Array.from({ length: nbColumns });
  let row = 0;
  const result = [];
  while (row < rows.length) {
    const resultRow = [];
    let rowIndex = 0;
    // Checks if any of the cells in the current row that is added was used from the incoming rows[row]
    let usedCurrentRow = false;
    // Checks if row was built entirely out of columns with rowSpan == 0
    let onlyMaxRowSpan = true;
    for (let column = 0; column < nbColumns; column++) {
      if (!columns[column]) {
        if (rowIndex === rows[row].length) {
          // We have reached the end of the current row from the table definition
          continue;
        }
        columns[column] = rows[row][rowIndex];
        rowIndex++;
        usedCurrentRow = true;
      }
      const currentCell = columns[column];
      if (!currentCell) {
        continue;
      }
      resultRow.push(currentCell.isHeader);
      if (currentCell.rowSpan > 0) {
        // Mark that there is at least one cell that is not built entirely out of columns with rowSpan == 0
        onlyMaxRowSpan = false;
        currentCell.rowSpan--;
        if (currentCell.rowSpan === 0) {
          columns[column] = undefined;
        }
      }
    }
    if (onlyMaxRowSpan) {
      // If the row was built entirely out of columns with rowSpan == 0, we finish the construction
      break;
    }
    result.push(resultRow);
    if (usedCurrentRow) {
      // Increment the row index only if we used any of the cells from the incoming rows[row]
      row++;
    }
  }
  return result;
}
