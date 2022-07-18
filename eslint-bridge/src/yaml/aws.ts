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
import { parseYaml } from './parser';

/**
 * Checks if the given YAML AST node is an AWS Lambda or Serverless function
 */
export function isAwsFunction(_key: any, pair: any, ancestors: any) {
  return isInlineAwsLambda(pair, ancestors) || isInlineAwsServerless(pair, ancestors);

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
}

/**
 * Extracts from a YAML file all the embedded JavaScript code snippets either
 * in AWS Lambda Functions or AWS Serverless Functions.
 */
export const parseAwsFromYaml = parseYaml.bind(null, isAwsFunction);
