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

/* TODO replace the `yaml-node12` dependency with `yaml` once we drop the support of Node.js 12 */
import * as yaml from 'yaml-node12';
import assert from 'assert';
import { ParsingError } from '../analyzer';
import { getFileContent, ParseExceptionCode } from '../parser';
import { EmbeddedJS } from './embedded-js';

/**
 * These formats are given by the YAML parser
 */
const [PLAIN_FORMAT, BLOCK_FOLDED_FORMAT, BLOCK_LITERAL_FORMAT] = [
  'PLAIN',
  'BLOCK_FOLDED',
  'BLOCK_LITERAL',
];
const SUPPORTED_FORMATS = [PLAIN_FORMAT, BLOCK_FOLDED_FORMAT, BLOCK_LITERAL_FORMAT];

/**
 * Extracts from a YAML file all the embedded JavaScript code snippets either
 * in AWS Lambda Functions or AWS Serverless Functions.
 */
export function parseYaml(filePath: string): EmbeddedJS[] | ParsingError {
  const text = getFileContent(filePath);

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
        code: ParseExceptionCode.Parsing,
      };
    }

    /**
     * Extract the embedded JavaScript snippets from the YAML abstract-syntax tree
     */
    yaml.visit(doc, {
      Pair(_, pair: any, ancestors: any) {
        if (
          (isInlineAwsLambda(pair, ancestors) || isInlineAwsServerless(pair, ancestors)) &&
          isSupportedFormat(pair)
        ) {
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

  /**
   * Embedded JavaScript code inside an AWS Lambda Function has the following structure:
   *
   * SomeLambdaFunction:
   *   Type: "AWS::Lambda::Function"
   *   Properties:
   *     Runtime: <nodejs-version>
   *     Code:
   *       ZipFile: <embedded-js-code>
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
   * Embedded JavaScript code inside an AWS Serverless Function has the following structure:
   *
   * SomeServerlessFunction:
   *   Type: "AWS::Serverless::Function"
   *   Properties:
   *     Runtime: <nodejs-version>
   *     InlineCode: <embedded-js-code>
   */
  function isInlineAwsServerless(pair: any, ancestors: any[]) {
    return (
      isInlineCode(pair) &&
      hasNodeJsRuntime(ancestors, 1) &&
      hasType(ancestors, 'AWS::Serverless::Function', 3)
    );

    /**
     * We need to check the pair directly instead of ancestors,
     * otherwise it will validate all siblings.
     */
    function isInlineCode(pair: any) {
      return pair.key.value === 'InlineCode';
    }
  }

  function hasNodeJsRuntime(ancestors: any[], level = 3) {
    return ancestors[ancestors.length - level]?.items?.some(
      (item: any) => item?.key.value === 'Runtime' && item?.value?.value.startsWith('nodejs'),
    );
  }

  function hasType(ancestors: any[], value: string, level = 5) {
    return ancestors[ancestors.length - level]?.items?.some(
      (item: any) => item?.key.value === 'Type' && item?.value.value === value,
    );
  }

  function isSupportedFormat(pair: yaml.Pair<any, any>) {
    return SUPPORTED_FORMATS.includes(pair.value?.type);
  }

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

  return embeddedJSs;
}
