/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type { Root, Document } from 'postcss';
import valueParser from 'postcss-value-parser';
import selectorParser from 'postcss-selector-parser';
import type { CssLocation, CssSyntaxHighlight } from './analysis.js';

/**
 * Resolves the absolute offset and (line, column) for a position
 * within a declaration value string.
 *
 * PostCSS gives us the declaration node's start position and the
 * raw value string. `postcss-value-parser` gives offsets within that
 * value. We translate the value-relative offset into an absolute
 * (line, column) using a precomputed line-start index.
 *
 * @param lineStarts absolute offsets for the start of each line (1-based line numbers)
 * @param sourceLength total source length, used to clamp offsets
 * @param valueStartOffset the absolute offset of the value string start
 * @param relativeOffset offset within the value string
 * @returns 1-based line and 0-based column
 */
function resolveValuePosition(
  lineStarts: number[],
  sourceLength: number,
  valueStartOffset: number,
  relativeOffset: number,
): { line: number; col: number } {
  const absOffset = Math.max(0, Math.min(sourceLength, valueStartOffset + relativeOffset));
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lineStart = lineStarts[mid];
    const nextLineStart = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : sourceLength + 1;

    if (absOffset < lineStart) {
      high = mid - 1;
    } else if (absOffset >= nextLineStart) {
      low = mid + 1;
    } else {
      return { line: mid + 1, col: absOffset - lineStart };
    }
  }

  const lastLineStart = lineStarts[lineStarts.length - 1] ?? 0;
  return { line: lineStarts.length || 1, col: absOffset - lastLineStart };
}

/**
 * Builds line start offsets for fast offset -> (line, column) resolution.
 * Handles LF, CRLF, and CR line endings.
 */
function buildLineStarts(source: string): number[] {
  const lineStarts: number[] = [0];
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '\r') {
      if (source[i + 1] === '\n') {
        i++;
      }
      lineStarts.push(i + 1);
    } else if (ch === '\n') {
      lineStarts.push(i + 1);
    }
  }
  return lineStarts;
}

/**
 * Computes syntax highlighting tokens from a PostCSS AST root node.
 *
 * Maps PostCSS node types to SonarQube highlight categories:
 * - Comment nodes -> COMMENT
 * - AtRule @name -> ANNOTATION
 * - Declaration property -> KEYWORD_LIGHT (or KEYWORD for SCSS $ variables)
 * - String literals in values -> STRING
 * - Numeric literals in values -> CONSTANT
 *
 * @param root the PostCSS AST root
 * @param source the original source text (needed for value offset resolution)
 * @returns array of syntax highlight tokens
 */
export function computeHighlighting(root: Root | Document, source: string): CssSyntaxHighlight[] {
  const highlights: CssSyntaxHighlight[] = [];
  const lineStarts = buildLineStarts(source);
  const sourceLength = source.length;
  const parseSelector = selectorParser();

  root.walk(node => {
    const start = node.source?.start;
    const end = node.source?.end;
    if (!start || !end) {
      return;
    }

    switch (node.type) {
      case 'comment': {
        // Highlight the entire comment range
        highlights.push({
          location: {
            startLine: start.line,
            startCol: start.column - 1,
            endLine: end.line,
            endCol: end.column,
          },
          textType: 'COMMENT',
        });
        break;
      }

      case 'atrule': {
        // Highlight the @name portion (e.g. @media, @import)
        // Starts at the @ symbol and spans the name length
        const nameLength = node.name.length;
        highlights.push({
          location: {
            startLine: start.line,
            startCol: start.column - 1,
            endLine: start.line,
            endCol: start.column - 1 + 1 + nameLength, // @ + name
          },
          textType: 'ANNOTATION',
        });
        break;
      }

      case 'rule': {
        // Parse selectors for ID selectors (#header → KEYWORD) and
        // hex colors (#fff → CONSTANT), matching old CssMetricSensor behavior.
        if (!node.selector.includes('#')) {
          break;
        }
        const selectorOffset = start.offset;
        if (selectorOffset != null) {
          try {
            const selectorAst = parseSelector.astSync(node.selector);
            selectorAst.walk(selectorNode => {
              if (selectorNode.type === 'id') {
                // #identifier → KEYWORD (or CONSTANT if hex color pattern)
                const idText = selectorNode.value;
                const hashOffset = selectorOffset + selectorNode.sourceIndex;
                const hashLength = idText.length + 1; // # + name
                const startPos = resolveValuePosition(lineStarts, sourceLength, 0, hashOffset);
                const endPos = resolveValuePosition(
                  lineStarts,
                  sourceLength,
                  0,
                  hashOffset + hashLength,
                );
                const isHexColor = /^[0-9a-fA-F]+$/.test(idText);
                highlights.push({
                  location: locationFromPositions(startPos, endPos),
                  textType: isHexColor ? 'CONSTANT' : 'KEYWORD',
                });
              }
            });
          } catch {
            // Selector parsing may fail on preprocessor syntax — skip gracefully
          }
        }
        break;
      }

      case 'decl': {
        // Highlight the property name
        const prop = node.prop;
        const textType = prop.startsWith('$') ? 'KEYWORD' : 'KEYWORD_LIGHT';
        highlights.push({
          location: {
            startLine: start.line,
            startCol: start.column - 1,
            endLine: start.line,
            endCol: start.column - 1 + prop.length,
          },
          textType,
        });

        // Parse the value to extract strings and numbers
        if (node.value && /["'\d]/.test(node.value)) {
          // Compute the absolute offset where the value starts in the source.
          // The declaration looks like "prop: value" (possibly with spaces around the colon).
          // We find the colon after the property, then skip whitespace to get to value start.
          const declStartOffset = start.offset;
          if (declStartOffset != null) {
            const colonIdx = source.indexOf(':', declStartOffset + prop.length);
            if (colonIdx !== -1) {
              // Skip whitespace after colon to find value start
              let valueStart = colonIdx + 1;
              while (
                valueStart < source.length &&
                (source[valueStart] === ' ' || source[valueStart] === '\t')
              ) {
                valueStart++;
              }
              highlightValueTokens(highlights, lineStarts, sourceLength, valueStart, node.value);
            }
          }
        }
        break;
      }
    }
  });

  return highlights;
}

/**
 * Parses a CSS declaration value and emits STRING and CONSTANT highlights.
 */
function highlightValueTokens(
  highlights: CssSyntaxHighlight[],
  lineStarts: number[],
  sourceLength: number,
  valueStartOffset: number,
  value: string,
): void {
  const parsed = valueParser(value);
  parsed.walk(valueNode => {
    if (valueNode.type === 'string') {
      // Include the quotes in the highlight
      const startPos = resolveValuePosition(
        lineStarts,
        sourceLength,
        valueStartOffset,
        valueNode.sourceIndex,
      );
      const quoteChar = valueNode.quote || '"';
      const rawLength = quoteChar.length + valueNode.value.length + quoteChar.length;
      const endPos = resolveValuePosition(
        lineStarts,
        sourceLength,
        valueStartOffset,
        valueNode.sourceIndex + rawLength,
      );
      highlights.push({
        location: locationFromPositions(startPos, endPos),
        textType: 'STRING',
      });
    } else if (valueNode.type === 'word' && isNumericToken(valueNode.value)) {
      const startPos = resolveValuePosition(
        lineStarts,
        sourceLength,
        valueStartOffset,
        valueNode.sourceIndex,
      );
      const endPos = resolveValuePosition(
        lineStarts,
        sourceLength,
        valueStartOffset,
        valueNode.sourceIndex + valueNode.value.length,
      );
      highlights.push({
        location: locationFromPositions(startPos, endPos),
        textType: 'CONSTANT',
      });
    }
  });
}

function locationFromPositions(
  start: { line: number; col: number },
  end: { line: number; col: number },
): CssLocation {
  return {
    startLine: start.line,
    startCol: start.col,
    endLine: end.line,
    endCol: end.col,
  };
}

/**
 * Checks whether a value-parser word token represents a numeric value.
 * Matches CSS numbers like 10, 3.14, .5, 10px, 1.5em, 100%, #fff, etc.
 * Excludes hex color literals and plain identifiers.
 */
function isNumericToken(value: string): boolean {
  // Match: optional sign, then digits with optional decimal, then optional unit
  return /^[+-]?(\d+\.?\d*|\.\d+)(%|[a-z]+)?$/i.test(value);
}
