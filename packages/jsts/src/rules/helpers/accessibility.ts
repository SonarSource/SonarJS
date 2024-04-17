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

import { getProp, getLiteralPropValue } from 'jsx-ast-utils';
import getElementType from 'eslint-plugin-jsx-a11y/lib/util/getElementType';
import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import { isHtmlElement } from './isHtmlElement';

export function isPresentationTable(context: Rule.RuleContext, node: TSESTree.JSXOpeningElement) {
  const DISALLOWED_VALUES = ['presentation', 'none'];
  const type = getElementType(context)(node);
  if (type.toLowerCase() !== 'table') {
    return false;
  }
  const role = getProp(node.attributes, 'role');
  if (!role) {
    return false;
  }
  const roleValue = String(getLiteralPropValue(role));

  return DISALLOWED_VALUES.includes(roleValue?.toLowerCase());
}

export type TableCell = {
  isHeader: boolean;
  headers?: string[];
  id?: string;
  node: TSESTree.JSXElement;
};

type TableCellInternal = TableCell & {
  rowSpan: number;
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

function getHeaders(tree: TSESTree.JSXElement): string[] | undefined {
  const headers = getProp(tree.openingElement.attributes, 'headers');
  if (headers) {
    return String(getLiteralPropValue(headers)).split(/\s+/);
  }
  return undefined;
}

function getID(tree: TSESTree.JSXElement): string | undefined {
  const id = getProp(tree.openingElement.attributes, 'id');
  if (id) {
    return String(getLiteralPropValue(id));
  }
  return undefined;
}

function extractRow(tree: TSESTree.JSXElement): TableCellInternal[] {
  const row: TableCellInternal[] = [];
  tree.children.forEach(child => {
    if (child.type !== 'JSXElement') {
      return;
    }
    const colSpanValue = colSpan(child);
    const rowSpanValue = rowSpan(child);
    const headers = getHeaders(child);
    const id = getID(child);
    for (let i = 0; i < colSpanValue; i++) {
      row.push({
        rowSpan: rowSpanValue,
        isHeader:
          child.openingElement.name.type === 'JSXIdentifier' &&
          child.openingElement.name.name === 'th',
        headers,
        id,
        node: child,
      });
    }
  });
  return row;
}

function extractRows(
  context: Rule.RuleContext,
  tree: TSESTree.JSXElement,
): TableCellInternal[][] | null {
  const rows: TableCellInternal[][] = [];
  let unknownTableStructure = false;
  tree.children.forEach(child => {
    if (child.type === 'JSXElement') {
      const childType = getElementType(context)(child.openingElement).toLowerCase();
      if (childType === 'tr') {
        rows.push(extractRow(child));
      } else if (childType === 'table') {
        // skip
      } else {
        const KNOWN_TABLE_STRUCTURE_ELEMENTS = ['thead', 'tbody', 'tfoot'];
        if (KNOWN_TABLE_STRUCTURE_ELEMENTS.includes(childType)) {
          const extractedRows = extractRows(context, child);
          if (extractedRows === null) {
            unknownTableStructure = true;
          } else if (extractedRows.length > 0) {
            rows.push(...extractedRows);
          }
        } else if (!isHtmlElement(child)) {
          unknownTableStructure = true;
        }
      }
    } else if (
      child.type === 'JSXExpressionContainer' &&
      child.expression.type !== 'JSXEmptyExpression'
    ) {
      unknownTableStructure = true;
    }
  });
  if (unknownTableStructure) {
    return null;
  }
  return rows;
}

export function computeGrid(
  context: Rule.RuleContext,
  tree: TSESTree.JSXElement,
): TableCell[][] | null {
  const rows = extractRows(context, tree);
  if (rows === null) {
    return null;
  }
  if (rows.length === 0) {
    return [];
  }
  const nbColumns = rows[0].length;
  const columns: (TableCellInternal | undefined)[] = Array.from({ length: nbColumns });
  let row = 0;
  const result: TableCell[][] = [];
  while (row < rows.length) {
    const resultRow: TableCell[] = [];
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
      // Remove rowSpan and add the cell to the result
      resultRow.push((({ rowSpan, ...cell }) => cell)(currentCell));
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
