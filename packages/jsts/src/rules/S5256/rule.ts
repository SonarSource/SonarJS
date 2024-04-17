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

import * as estree from 'estree';
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';

export const rule: Rule.RuleModule = {
  meta: {},
  create(context: Rule.RuleContext) {
    const checkValidTable = (tree: TSESTree.JSXElement): boolean => {
      const grid = computeGrid(tree);
      if (grid.length === 0) {
        return false;
      }
      let hasHeader = false;
      for (const row of grid) {
        if (row.every(isHeader => isHeader)) {
          hasHeader = true;
          break;
        }
      }
      for (let col = 0; col < grid[0].length; col++) {
        if (grid.every(row => col >= row.length || row[col])) {
          hasHeader = true;
          break;
        }
      }
      return hasHeader;
    };
    return {
      JSXElement(node: estree.Node) {
        const tree = node as unknown as TSESTree.JSXElement;
        if (
          tree.openingElement.name.type === 'JSXIdentifier' &&
          tree.openingElement.name.name === 'table'
        ) {
          const role = tree.openingElement.attributes.find(
            attr =>
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              attr.name.name === 'role',
          );
          if (
            role &&
            role.type === 'JSXAttribute' &&
            role.value!.type === 'Literal' &&
            (role.value!.value?.toString().toLowerCase() === 'presentation' ||
              role.value!.value?.toString().toLowerCase() === 'none')
          ) {
            return;
          }
          const ariaHidden = tree.openingElement.attributes.find(
            attr =>
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              attr.name.name === 'aria-hidden' &&
              attr.value?.type === 'Literal' &&
              attr.value.value === 'true',
          );
          if (ariaHidden) {
            return;
          }
          if (!checkValidTable(tree)) {
            context.report({
              node: node,
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
  tree.openingElement.attributes.forEach(attr => {
    if (
      attr.type === 'JSXAttribute' &&
      attr.name.type === 'JSXIdentifier' &&
      attr.name.name === spanKey
    ) {
      span = parseInt((attr.value as TSESTree.Literal).value as string);
    }
  });
  return span;
}

function rowSpan(tree: TSESTree.JSXElement): number {
  let value = computeSpan(tree, 'rowspan');
  if (value > 65534) {
    value = 65534;
  }
  return value;
}

function colSpan(tree: TSESTree.JSXElement): number {
  let value = computeSpan(tree, 'colspan');
  if (value > 10000) {
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
      let extractedRows = extractRows(child);
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
  const columns: (TableCell | undefined)[] = new Array(nbColumns);
  let row = 0;
  const result = [];
  while (row < rows.length) {
    const resultRow = [];
    let rowIndex = 0;
    let usedCurrentRow = false;
    let onlyMaxRowSpan = true;
    for (let column = 0; column < nbColumns; column++) {
      if (!columns[column]) {
        if (rowIndex === rows[row].length) {
          break;
        }
        columns[column] = rows[row][rowIndex++];
        usedCurrentRow = true;
      }
      resultRow.push(columns[column]!.isHeader);
      if (columns[column]!.rowSpan > 0) {
        onlyMaxRowSpan = false;
        columns[column]!.rowSpan--;
        if (columns[column]!.rowSpan === 0) {
          columns[column] = undefined;
        }
      }
    }
    if (onlyMaxRowSpan) {
      break;
    }
    result.push(resultRow);
    if (usedCurrentRow) {
      row++;
    }
  }
  return result;
}
