/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

/* TODO replace the `yaml-node12` dependency with `yaml` once we drop Node.js 12 (i3231) */
import * as yaml from 'yaml-node12';
import assert from 'assert';
import { EmbeddedJS } from './embedded-js';
import { readFile } from 'helpers';
import { AnalysisError, AnalysisErrorCode } from 'services/analysis';
import { BLOCK_FOLDED_FORMAT, BLOCK_LITERAL_FORMAT, isSupportedFormat } from './format';

/**
 * A function predicate to visit a YAML node
 */
export type YamlVisitorPredicate = (key: any, node: any, ancestors: any) => boolean;

/**
 * Parses YAML file and extracts JS code according to the provided predicate
 */
export function parseYaml(
  predicate: YamlVisitorPredicate,
  filePath: string,
): EmbeddedJS[] | AnalysisError {
  const text = readFile(filePath);

  const erronousLine = findUnsupportedYaml(text);
  if (erronousLine >= 0) {
    return {
      code: AnalysisErrorCode.IgnoreError,
      message: 'Unsupported YAML code',
      line: erronousLine,
    };
  }

  /**
   * Builds the abstract syntax tree of the YAML file
   *
   * YAML supports a marker "---" that indicates the end of a document: a file may contain multiple documents.
   * This means that it can return multiple abstract syntax trees.
   */
  const lineCounter = new yaml.LineCounter();
  const tokens = new yaml.Parser(lineCounter.addNewLine).parse(text);
  const docs = new yaml.Composer({ keepSourceTokens: true }).compose(tokens);

  const embeddedJSs: EmbeddedJS[] = [];
  for (const doc of docs) {
    /**
     * Although there could be multiple parsing errors in the YAML file, we only consider
     * the first error to be consistent with how parsing errors are returned when parsing
     * standalone JavaScript source files.
     */
    if (doc.errors.length > 0) {
      const error = doc.errors[0];
      return {
        line: lineCounter.linePos(error.pos[0]).line,
        message: error.message,
        code: AnalysisErrorCode.Parsing,
      };
    }

    /**
     * Extract the embedded JavaScript snippets from the YAML abstract syntax tree
     */
    yaml.visit(doc, {
      Pair(key: any, pair: any, ancestors: any) {
        if (predicate(key, pair, ancestors) && isSupportedFormat(pair)) {
          const { value, srcToken } = pair;
          const code = srcToken.value.source;
          const format = pair.value.type;

          /**
           * This assertion should never fail because the visited node denotes either an AWS Lambda
           * or an AWS Serverless with embedded JavaScript code that can be extracted at this point.
           */
          assert(code != null, 'An extracted embedded JavaScript snippet should not be undefined.');

          const [offsetStart] = value.range;
          const { line, col: column } = lineCounter.linePos(offsetStart);
          const lineStarts = lineCounter.lineStarts;

          embeddedJSs.push({
            code,
            line,
            column,
            offset: fixOffset(offsetStart, value.type),
            lineStarts,
            text,
            format,
          });
        }
      },
    });
  }

  return embeddedJSs;

  /**
   * Fixes the offset of the beginning of the embedded JavaScript snippet in the YAML file,
   * as it changes depending on the type of the embedding format.
   */
  function fixOffset(offset: number, format: string): number {
    if ([BLOCK_FOLDED_FORMAT, BLOCK_LITERAL_FORMAT].includes(format)) {
      /* +1 for the block marker (`>` or `|`) and +1 for the line break */
      return offset + 2;
    } else {
      return offset;
    }
  }
}

// Helm template directives regexp
const DIRECTIVE_IN_COMMENT = `#.*\\{\\{`;
const DIRECTIVE_IN_SINGLE_QUOTE = `'[^']*\\{\\{[^']*'`;
const DIRECTIVE_IN_DOUBLE_QUOTE = `\"[^\"]*\\{\\{[^\"]*\"`;
const CODEFRESH_VARIABLES = `\\{\\{[\\w\\s]+}}`;
const HELM_DIRECTIVE_IN_COMMENT_OR_STRING = [
  DIRECTIVE_IN_COMMENT,
  DIRECTIVE_IN_SINGLE_QUOTE,
  DIRECTIVE_IN_DOUBLE_QUOTE,
  CODEFRESH_VARIABLES,
].join('|');
const helmDirectiveRegex = new RegExp('(' + HELM_DIRECTIVE_IN_COMMENT_OR_STRING + ')');

function findUnsupportedYaml(text: string): number {
  const lines = text.split('\n');
  for (const [lineNumber, line] of lines.entries()) {
    if (line.includes('{{') && !helmDirectiveRegex.test(line)) {
      return lineNumber;
    }
  }
  return -1;
}
