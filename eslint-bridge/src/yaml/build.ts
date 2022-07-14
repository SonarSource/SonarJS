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
import { AST, SourceCode } from 'eslint';
import { Comment, Node } from 'estree';
import { FileType, visit } from '../utils';
import { ParsingError } from '../analyzer';
import { buildSourceCode } from '../parser';
import { EmbeddedJS } from './embedded-js';
import { parseYaml } from './parser';

/**
 *
 * If there is at least 1 error in any embedded JS, we return only the first error
 *
 * @param filePath
 * @returns
 */
export function buildSourceCodesFromYaml(filePath: string): SourceCode[] | ParsingError {
  const embeddedJSsOrError = parseYaml(filePath);

  const constainsError = !Array.isArray(embeddedJSsOrError);
  if (constainsError) {
    return embeddedJSsOrError;
  }
  const embeddedJSs = embeddedJSsOrError;

  const sourceCodes: SourceCode[] = [];
  for (const embeddedJS of embeddedJSs) {
    const { code } = embeddedJS;
    /**
     * The file path is left empty as it is ignored by `buildSourceCode` if the file content is provided, which
     * happens to be the case here since we extract inline JavaScript code.
     */
    const input = { filePath: '', fileContent: code, fileType: FileType.MAIN, tsConfigs: [] };
    const sourceCodeOrError = buildSourceCode(input, 'js');
    if (sourceCodeOrError instanceof SourceCode) {
      const patchedSourceCode = patchSourceCode(sourceCodeOrError, embeddedJS);
      sourceCodes.push(patchedSourceCode);
    } else {
      return patchParsingError(sourceCodeOrError, embeddedJS);
    }
  }
  return sourceCodes;

  /**
   *
   * @param originalSourceCode
   * @param embeddedJS
   * @returns
   */
  function patchSourceCode(originalSourceCode: SourceCode, embeddedJS: EmbeddedJS) {
    /* taken from eslint/lib/source-code/source-code.js#constructor */
    function computeLines() {
      const lineBreakPattern = /\r\n|[\r\n\u2028\u2029]/u;
      const lineEndingPattern = new RegExp(lineBreakPattern.source, 'gu');
      let match;
      const lines = [];

      let i = 0;
      while ((match = lineEndingPattern.exec(embeddedJS.text))) {
        lines.push(embeddedJS.text.slice(embeddedJS.lineStarts[i], match.index));
        i++;
      }
      lines.push(embeddedJS.text.slice(embeddedJS.lineStarts[embeddedJS.lineStarts.length - 1]));

      return lines;
    }

    /**
     * Patches loc.start, loc.end and range in sourceCode.ast nodes
     */
    function patchLocations(sourceCode: SourceCode, embeddedJS: EmbeddedJS) {
      const { offset } = embeddedJS;

      visit(sourceCode, node => {
        fixNodeLocation(node);
      });

      const { comments } = sourceCode.ast;
      for (const comment of comments) {
        fixNodeLocation(comment);
      }

      const { tokens } = sourceCode.ast;
      for (const token of tokens) {
        fixNodeLocation(token);
      }

      function fixNodeLocation(node: Node | Comment | AST.Token) {
        if (node.loc != null && node.range != null) {
          node.loc = {
            start: sourceCode.getLocFromIndex(node.range[0] + offset),
            end: sourceCode.getLocFromIndex(node.range[1] + offset),
          };
        }
        if (node.range) {
          const [sRange, eRange] = node.range;
          node.range = [sRange + offset, eRange + offset];
        }
      }
    }

    /**
     * 1. We compute lines here because sourceCode.lines is in the JS referrential and
     * the YAML parser does not provide it
     * 2. We override the values lineStartIndices, text and lines in sourceCode
     * from the JS to the YAML referrential. We must use Object.create() because
     * SourceCode's properties are frozen
     * 3. We patch the sourceCode.ast nodes after 1 & 2 as it relies on values computed earlier
     * 4. We rebuild sourceCode from the patched values because it builds internal properties that are dependent on them
     */
    const lines = computeLines();
    const patchedSourceCode = Object.create(originalSourceCode, {
      lineStartIndices: { value: embeddedJS.lineStarts },
      text: { value: embeddedJS.text },
      lines: { value: lines },
    });

    patchLocations(patchedSourceCode, embeddedJS);

    return new SourceCode({
      text: patchedSourceCode.text,
      ast: patchedSourceCode.ast,
      parserServices: patchedSourceCode.parserServices,
      scopeManager: patchedSourceCode.scopeManager,
      visitorKeys: patchedSourceCode.visitorKeys,
    });
  }

  /**
   *
   * @param parsingError
   * @param embeddedJS
   * @returns
   */
  function patchParsingError(parsingError: ParsingError, embeddedJS: EmbeddedJS): ParsingError {
    const { code, line, message } = parsingError;
    let patchedLine: number | undefined;
    let patchedMessage = message;
    if (line) {
      patchedLine = embeddedJS.format === 'PLAIN' ? embeddedJS.line : embeddedJS.line + line;
      patchedMessage = patchParsingErrorMessage(message, patchedLine, embeddedJS);
    }
    return {
      code,
      line: patchedLine,
      message: patchedMessage,
    };
  }

  /**
   *
   * @param message
   * @param patchedLine
   * @param embeddedJS
   * @returns
   */
  function patchParsingErrorMessage(message: string, patchedLine: number, embeddedJS: EmbeddedJS) {
    /* patching error message `(<line>:<column>)` */
    const regex = /((?<line>\d+):(?<column>\d+))/;
    const found = message.match(regex);
    if (found) {
      const line = found.groups!.line;
      const column = Number(found.groups!.column);
      const patchedColumn = embeddedJS.format === 'PLAIN' ? column + embeddedJS.column - 1 : column;
      return message.replace(`(${line}:${column})`, `(${patchedLine}:${patchedColumn})`);
    }
    return message;
  }
}
