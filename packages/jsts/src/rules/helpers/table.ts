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
import type { TSESTree } from '@typescript-eslint/utils';
import pkg from 'jsx-ast-utils';
const { getLiteralPropValue, getProp } = pkg;
import type { Rule } from 'eslint';
import { isHtmlElement } from './isHtmlElement.js';
import { getElementType } from './accessibility.js';

export type TableCell = {
  isHeader: boolean;
  headers?: string[];
  id?: string;
  node: TSESTree.JSXElement;
  internalNodeId: number;
};

type TableCellInternal = TableCell & {
  rowSpan: number;
};

const MAX_ROW_SPAN = 65534;
const MAX_INVALID_COL_SPAN = 10000;
const KNOWN_TABLE_STRUCTURE_ELEMENTS = ['thead', 'tbody', 'tfoot'];

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
  if (value > MAX_ROW_SPAN) {
    value = MAX_ROW_SPAN;
  }
  return value;
}

function colSpan(tree: TSESTree.JSXElement): number {
  let value = computeSpan(tree, 'colspan');
  if (value > MAX_INVALID_COL_SPAN) {
    value = 1;
  }
  return value;
}

function getHeaders(tree: TSESTree.JSXElement): string[] | undefined {
  const headers = getProp(tree.openingElement.attributes, 'headers');
  if (headers) {
    const headerVal = getLiteralPropValue(headers);
    if (headerVal && String(headerVal).trim() !== '') {
      return String(headerVal).split(/\s+/);
    }
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

function createTableCell(internalCell: TableCellInternal): TableCell {
  // Drop rowSpan from the cell
  const { rowSpan, ...tableCell } = internalCell;
  return tableCell;
}

function extractRows(
  context: Rule.RuleContext,
  tree: TSESTree.JSXElement | TSESTree.JSXFragment,
): TableCellInternal[][] | null {
  const rows: TableCellInternal[][] = [];
  let internalNodeCount = 0;
  let unknownTableStructure = false;

  const extractRow = (tree: TSESTree.JSXElement): TableCellInternal[] | null => {
    const row: TableCellInternal[] = [];
    let unknownRowStructure = false;
    tree.children.forEach(child => {
      if (
        (child.type === 'JSXExpressionContainer' &&
          child.expression.type === 'JSXEmptyExpression') ||
        child.type === 'JSXText'
      ) {
        // Skip comment
        return;
      }
      const isTdOrTh =
        child.type === 'JSXElement' &&
        child.openingElement.name.type === 'JSXIdentifier' &&
        ['td', 'th'].includes(child.openingElement.name.name);
      if (!isTdOrTh) {
        unknownRowStructure = true;
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
          internalNodeId: internalNodeCount,
        });
      }
      internalNodeCount += 1;
    });
    if (unknownRowStructure) {
      return null;
    }
    return row;
  };

  const handleInternalStructure = (tree: TSESTree.JSXElement | TSESTree.JSXFragment) => {
    const extractedRows = extractRows(context, tree);
    if (extractedRows === null) {
      unknownTableStructure = true;
    } else if (extractedRows.length > 0) {
      rows.push(...extractedRows);
    }
  };

  tree.children.forEach(child => {
    if (child.type === 'JSXElement') {
      const childType = getElementType(context)(child.openingElement).toLowerCase();
      if (childType === 'tr') {
        const extractedRow = extractRow(child);
        if (!extractedRow) {
          unknownTableStructure = true;
        } else {
          rows.push(extractedRow);
        }
      } else if (childType === 'table') {
        // skip
      } else if (KNOWN_TABLE_STRUCTURE_ELEMENTS.includes(childType)) {
        handleInternalStructure(child);
      } else if (!isHtmlElement(child)) {
        unknownTableStructure = true;
      }
    } else if (
      child.type === 'JSXExpressionContainer' &&
      child.expression.type !== 'JSXEmptyExpression'
    ) {
      unknownTableStructure = true;
    } else if (child.type === 'JSXFragment') {
      handleInternalStructure(child);
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
    let indexInRow = 0;
    // Checks if any of the cells in the current row that is added was used from the incoming rows[row]
    let usedCurrentRow = false;
    // Checks if row was built entirely out of columns with rowSpan == 0
    let onlyMaxRowSpan = true;
    for (let column = 0; column < nbColumns; column++) {
      if (!columns[column]) {
        if (indexInRow === rows[row].length) {
          // We have reached the end of the current row from the table definition
          continue;
        }
        columns[column] = rows[row][indexInRow];
        indexInRow++;
        usedCurrentRow = true;
      }
      const currentCell = columns[column];
      if (!currentCell) {
        continue;
      }
      resultRow.push(createTableCell(currentCell));
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
