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
import type { CssLocation, CssSyntaxHighlight } from './analysis.js';

/**
 * Resolves the absolute offset and (line, column) for a position
 * within a declaration value string.
 *
 * PostCSS gives us the declaration node's start position and the
 * raw value string. `postcss-value-parser` gives offsets within that
 * value. We walk from the declaration value start to translate the
 * value-relative offset into absolute line/column.
 *
 * @param source the full source text
 * @param valueStartOffset the absolute offset of the value string start
 * @param relativeOffset offset within the value string
 * @returns 1-based line and 0-based column
 */
function resolveValuePosition(
  source: string,
  valueStartOffset: number,
  relativeOffset: number,
): { line: number; col: number } {
  const absOffset = valueStartOffset + relativeOffset;
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < absOffset && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }
  const col = absOffset - lastNewline - 1;
  return { line, col };
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
        if (node.value) {
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
              highlightValueTokens(highlights, source, valueStart, node.value);
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
  source: string,
  valueStartOffset: number,
  value: string,
): void {
  const parsed = valueParser(value);
  parsed.walk(valueNode => {
    if (valueNode.type === 'string') {
      // Include the quotes in the highlight
      const startPos = resolveValuePosition(source, valueStartOffset, valueNode.sourceIndex);
      const quoteChar = valueNode.quote || '"';
      const rawLength = quoteChar.length + valueNode.value.length + quoteChar.length;
      const endPos = resolveValuePosition(
        source,
        valueStartOffset,
        valueNode.sourceIndex + rawLength,
      );
      highlights.push({
        location: locationFromPositions(startPos, endPos),
        textType: 'STRING',
      });
    } else if (valueNode.type === 'word' && isNumericToken(valueNode.value)) {
      const startPos = resolveValuePosition(source, valueStartOffset, valueNode.sourceIndex);
      const endPos = resolveValuePosition(
        source,
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
