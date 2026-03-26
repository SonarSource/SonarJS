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
 * Highlighting parity notes (vs old Java CssMetricSensor):
 * - The old sensor used a regex-based lexer over the full source and
 *   highlighted all tokens, regardless of selector/value context.
 * - In particular, any HASH_IDENTIFIER token matching a hex color pattern
 *   (e.g. #fff, #e535ab) was highlighted as CONSTANT, even when used as an ID selector.
 * - We keep that behavior for compatibility by highlighting hex colors in both
 *   selectors and declaration values.
 *
 * Why we need sub-parsers (postcss-value-parser, postcss-selector-parser):
 * - PostCSS gives us full source positions for top-level nodes (comments, at-rules,
 *   declarations, rules), but declaration values and selectors are opaque strings.
 * - To highlight individual tokens within values (strings, numbers, hex colors) and
 *   selectors (#id), we use dedicated sub-parsers that provide offsets relative to
 *   the value/selector string start. We then convert those relative offsets to
 *   absolute source positions using the source map built by buildSourceMap().
 */

/**
 * Builds two data structures for O(1) offset-to-position lookups:
 *
 * - lineAt: a Uint32Array of size source.length+1, where lineAt[offset] is the
 *   1-based line number for the character at that offset. The extra entry at
 *   source.length covers the EOF position (used for end-of-token offsets).
 *
 * - lineStarts: an array where lineStarts[i] is the absolute offset of the first
 *   character on line i+1 (0-indexed). Used to compute columns:
 *   column = offset - lineStarts[lineAt[offset] - 1]
 *
 * Handles LF (\n), CRLF (\r\n), and CR (\r) line endings. For CRLF, both \r and \n
 * are assigned to the same line (the line before the break).
 *
 * Example: source = "ab\ncd\n"
 *   lineAt    = [1, 1, 1, 2, 2, 2, 2]  (indices 0-6, including EOF at index 6)
 *   lineStarts = [0, 3]                  (line 1 starts at 0, line 2 starts at 3)
 */
function buildSourceMap(source: string): { lineAt: Uint32Array; lineStarts: number[] } {
  const lineAt = new Uint32Array(source.length + 1);
  const lineStarts: number[] = [0];
  let line = 1;
  for (let i = 0; i < source.length; i++) {
    lineAt[i] = line;
    const ch = source[i];
    if (ch === '\r') {
      // For CRLF, consume the \n as part of the same line break
      if (source[i + 1] === '\n') {
        i++;
        lineAt[i] = line;
      }
      line++;
      lineStarts.push(i + 1);
    } else if (ch === '\n') {
      line++;
      lineStarts.push(i + 1);
    }
  }
  // EOF position maps to the last line (needed when a token ends at source.length)
  lineAt[source.length] = line;
  return { lineAt, lineStarts };
}

/**
 * Converts an absolute source offset to a 1-based line and 0-based column.
 *
 * The offset is clamped to [0, sourceLength] to safely handle edge cases
 * (e.g. tokens at the very end of the file).
 *
 * Line is looked up directly from lineAt (O(1)).
 * Column is computed by subtracting the offset where the line starts.
 */
function positionAt(
  lineAt: Uint32Array,
  lineStarts: number[],
  sourceLength: number,
  offset: number,
): { line: number; col: number } {
  const clamped = Math.max(0, Math.min(sourceLength, offset));
  const line = lineAt[clamped];
  const col = clamped - lineStarts[line - 1];
  return { line, col };
}

/**
 * Computes syntax highlighting tokens from a PostCSS AST root node.
 *
 * Walks all AST nodes and maps them to SonarQube highlight categories:
 *
 * | PostCSS node type | Highlighted portion      | SonarQube TextType |
 * |-------------------|--------------------------|--------------------|
 * | comment           | entire comment           | COMMENT            |
 * | atrule            | @name (e.g. @media)      | ANNOTATION         |
 * | rule              | #id selectors            | KEYWORD            |
 * | rule              | #hex colors in selectors | CONSTANT           |
 * | decl              | property name            | KEYWORD_LIGHT      |
 * | decl              | SCSS $variable name      | KEYWORD            |
 * | decl value        | string literals          | STRING             |
 * | decl value        | numeric values           | CONSTANT           |
 * | decl value        | hex colors               | CONSTANT           |
 *
 * For comment, atrule, and decl property names, positions come directly from
 * PostCSS node.source.start/end (1-based lines, 1-based columns converted to 0-based).
 *
 * For tokens inside declaration values and selectors, we use sub-parsers
 * (postcss-value-parser and postcss-selector-parser) which give offsets relative
 * to the value/selector string. These relative offsets are converted to absolute
 * source positions via the source map.
 *
 * @param root the PostCSS AST root (from Stylelint's parse result)
 * @param source the original source text (needed for offset-based position resolution)
 * @returns array of syntax highlight tokens sorted by appearance in source
 */
export function computeHighlighting(root: Root | Document, source: string): CssSyntaxHighlight[] {
  const highlights: CssSyntaxHighlight[] = [];
  const { lineAt, lineStarts } = buildSourceMap(source);
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
        // PostCSS gives us exact start/end for comments, including delimiters
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
        // Highlight only the @name portion (e.g. "@media", "@import", "@if").
        // node.name is the name without @, so total length = 1 (@) + name.length.
        // At-rules always start on a single line so endLine = startLine.
        const nameLength = node.name.length;
        highlights.push({
          location: {
            startLine: start.line,
            startCol: start.column - 1,
            endLine: start.line,
            endCol: start.column - 1 + 1 + nameLength, // +1 for the @ symbol
          },
          textType: 'ANNOTATION',
        });
        break;
      }

      case 'rule': {
        // Selectors are opaque strings in PostCSS (e.g. "#header, .class").
        // We use postcss-selector-parser to find #id tokens within the selector.
        // Quick bail-out: skip selector parsing entirely if there's no # character.
        if (!node.selector.includes('#')) {
          break;
        }
        const selectorOffset = start.offset;
        if (selectorOffset != null) {
          try {
            const selectorAst = parseSelector.astSync(node.selector);
            selectorAst.walk(selectorNode => {
              if (selectorNode.type === 'id') {
                const idText = selectorNode.value;
                // sourceIndex is the offset of # within the selector string
                const hashOffset = selectorOffset + selectorNode.sourceIndex;
                const hashLength = idText.length + 1; // # + identifier name

                const startPos = positionAt(lineAt, lineStarts, sourceLength, hashOffset);
                const endPos = positionAt(
                  lineAt,
                  lineStarts,
                  sourceLength,
                  hashOffset + hashLength,
                );

                // Hex color patterns (#fff, #e535ab) → CONSTANT; real IDs (#header) → KEYWORD
                const isHexColor = isHexColorToken(`#${idText}`);
                highlights.push({
                  location: locationFromPositions(startPos, endPos),
                  textType: isHexColor ? 'CONSTANT' : 'KEYWORD',
                });
              }
            });
          } catch {
            // Selector parsing may fail on preprocessor syntax (e.g. SCSS nesting) — skip
          }
        }
        break;
      }

      case 'decl': {
        // Highlight the property name (e.g. "color", "font-size", "$variable").
        // SCSS variables ($var) get KEYWORD; regular properties get KEYWORD_LIGHT.
        // Property names are always on a single line.
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

        // Parse the value to highlight strings, numbers, and hex colors.
        // Quick bail-out: only parse if the value likely contains highlightable tokens.
        if (node.value && /["'#\d]/.test(node.value)) {
          // PostCSS gives us node.value as a plain string (e.g. "10px solid #fff").
          // We need its absolute offset in the source to map sub-parser offsets.
          // A declaration looks like "prop: value" with optional spaces around ":".
          // We find the colon after the property name and skip whitespace to get the
          // absolute offset where the value string begins.
          const declStartOffset = start.offset;
          if (declStartOffset != null) {
            const colonIdx = source.indexOf(':', declStartOffset + prop.length);
            if (colonIdx !== -1) {
              let valueStart = colonIdx + 1;
              while (
                valueStart < source.length &&
                (source[valueStart] === ' ' || source[valueStart] === '\t')
              ) {
                valueStart++;
              }
              highlightValueTokens(
                highlights,
                lineAt,
                lineStarts,
                sourceLength,
                valueStart,
                node.value,
              );
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
 * Parses a CSS declaration value string and emits STRING and CONSTANT highlights.
 *
 * Uses postcss-value-parser to tokenize the value. Each token has a sourceIndex
 * (offset relative to the value string start). We add valueStartOffset to convert
 * these to absolute source offsets, then resolve to (line, col) via the source map.
 *
 * @param highlights array to push highlights into
 * @param lineAt per-character line number lookup
 * @param lineStarts per-line start offset lookup
 * @param sourceLength total source length for clamping
 * @param valueStartOffset absolute offset in source where this value string begins
 * @param value the declaration value string to parse
 */
function highlightValueTokens(
  highlights: CssSyntaxHighlight[],
  lineAt: Uint32Array,
  lineStarts: number[],
  sourceLength: number,
  valueStartOffset: number,
  value: string,
): void {
  const parsed = valueParser(value);
  parsed.walk(valueNode => {
    // sourceIndex/sourceEndIndex are offsets relative to the value string.
    // Adding valueStartOffset converts them to absolute source offsets.
    const startOffset = valueStartOffset + valueNode.sourceIndex;
    const endOffset = valueStartOffset + valueNode.sourceEndIndex;

    if (valueNode.type === 'string') {
      // String tokens: the range includes surrounding quotes and escape sequences.
      highlights.push({
        location: locationFromOffsets(lineAt, lineStarts, sourceLength, startOffset, endOffset),
        textType: 'STRING',
      });
    } else if (
      valueNode.type === 'word' &&
      (isNumericToken(valueNode.value) || isHexColorToken(valueNode.value))
    ) {
      // Numeric values (10, 3.14, 10px, 100%) and hex colors (#fff, #e535ab) → CONSTANT.
      highlights.push({
        location: locationFromOffsets(lineAt, lineStarts, sourceLength, startOffset, endOffset),
        textType: 'CONSTANT',
      });
    }
  });
}

/** Converts two {line, col} positions into a CssLocation. */
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

/** Converts two absolute source offsets into a CssLocation via the source map. */
function locationFromOffsets(
  lineAt: Uint32Array,
  lineStarts: number[],
  sourceLength: number,
  startOffset: number,
  endOffset: number,
): CssLocation {
  const start = positionAt(lineAt, lineStarts, sourceLength, startOffset);
  const end = positionAt(lineAt, lineStarts, sourceLength, endOffset);
  return {
    startLine: start.line,
    startCol: start.col,
    endLine: end.line,
    endCol: end.col,
  };
}

/**
 * Checks whether a value-parser word token represents a CSS numeric value.
 * Matches: 10, 3.14, .5, 10px, 1.5em, 100%, etc.
 * Does NOT match hex colors (#fff) or plain identifiers (auto, bold).
 */
function isNumericToken(value: string): boolean {
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:%|[a-z]+)?$/i.test(value);
}

/** Matches CSS hex color literals: #fff, #e535ab, #00FF00, etc. */
function isHexColorToken(value: string): boolean {
  return /^#[0-9a-fA-F]+$/.test(value);
}
