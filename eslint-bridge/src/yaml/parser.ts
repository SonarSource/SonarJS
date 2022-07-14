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
import * as yaml from 'yaml-node12'; /* TODO replace this with `yaml` when we drop the support of Node.js 12 */
import assert from 'assert';
import { ParsingError } from '../analyzer';
import { getFileContent, ParseExceptionCode } from '../parser';
import { EmbeddedJS } from './embedded-js';

/**
 *
 * @param filePath
 * @returns
 */
export function parseYaml(filePath: string): EmbeddedJS[] | ParsingError {
  const src = getFileContent(filePath);
  const lineCounter = new yaml.LineCounter();
  const tokens = new yaml.Parser(lineCounter.addNewLine).parse(src);
  // YAML supports a marker "---" that indicates the end of a document: a file may contain multiple documents
  const docs = new yaml.Composer({ keepSourceTokens: true }).compose(tokens);

  const embeddedJSs: EmbeddedJS[] = [];
  for (const doc of docs) {
    // we only consider the first error
    if (doc.errors.length > 0) {
      const error = doc.errors[0];
      return {
        line: lineCounter.linePos(error.pos[0]).line,
        message: error.message,
        code: ParseExceptionCode.Parsing,
      };
    }

    yaml.visit(doc, {
      Pair(_, pair: any, ancestors: any) {
        if (
          (isInlineAwsLambda(pair, ancestors) || isInlineAwsServerless(pair, ancestors)) &&
          isSupportedFormat(pair)
        ) {
          const { value, srcToken } = pair;
          const code = srcToken.value.source;
          // this should not happen
          assert(code != null, 'An extracted inline JavaScript snippet should not be undefined.');
          const [offsetStart] = value.range;
          const { line, col: column } = lineCounter.linePos(offsetStart);
          const lineStarts = lineCounter.lineStarts;

          embeddedJSs.push({
            code,
            line,
            column,
            offset: fixOffset(offsetStart, value.type),
            lineStarts,
            text: src,
            format: pair.value.type,
          });
        }
      },
    });
  }

  /**
   *
   * @param pair
   * @param ancestors
   * @returns
   */
  function isInlineAwsLambda(pair: any, ancestors: any[]) {
    return (
      isZipFile(pair) &&
      hasCode(ancestors) &&
      hasNodeJsRuntime(ancestors) &&
      hasType(ancestors, 'AWS::Lambda::Function')
    );

    function isZipFile(pair: any) {
      return pair.key.value === 'ZipFile';
    }
    function hasCode(ancestors: any[], level = 2) {
      return ancestors[ancestors.length - level]?.key?.value === 'Code';
    }
  }

  /**
   *
   * @param pair
   * @param ancestors
   * @returns
   */
  function isInlineAwsServerless(pair: any, ancestors: any[]) {
    return (
      isInlineCode(pair) &&
      hasNodeJsRuntime(ancestors, 1) &&
      hasType(ancestors, 'AWS::Serverless::Function', 3)
    );

    // we need to check the pair directly instead of ancestors, otherwise it will validate all siblings
    function isInlineCode(pair: any) {
      return pair.key.value === 'InlineCode';
    }
  }

  /**
   *
   * @param pair
   * @returns
   */
  function isSupportedFormat(pair: yaml.Pair<any, any>) {
    return ['PLAIN', 'BLOCK_FOLDED', 'BLOCK_LITERAL'].includes(pair.value?.type);
  }

  /**
   *
   * @param ancestors
   * @param level
   * @returns
   */
  function hasNodeJsRuntime(ancestors: any[], level = 3) {
    return ancestors[ancestors.length - level]?.items?.some(
      (item: any) => item?.key.value === 'Runtime' && item?.value?.value.startsWith('nodejs'),
    );
  }

  /**
   *
   * @param ancestors
   * @param value
   * @param level
   * @returns
   */
  function hasType(ancestors: any[], value: string, level = 5) {
    return ancestors[ancestors.length - level]?.items?.some(
      (item: any) => item?.key.value === 'Type' && item?.value.value === value,
    );
  }

  // the offset value needs to be fixed depending on the type of string format in YAML
  function fixOffset(offset: number, format: string): number {
    if (format === 'BLOCK_FOLDED' || format === 'BLOCK_LITERAL') {
      return offset + 2;
    } else {
      return offset;
    }
  }

  return embeddedJSs;
}
