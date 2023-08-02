/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { ParsingContext } from '@sonar/shared/embedded';

export const lambdaParsingContext: ParsingContext = {
  predicate: isInlineAwsLambda,
  picker: pickResourceName.bind(null, 6),
};

export const serverlessParsingContext: ParsingContext = {
  predicate: isInlineAwsServerless,
  picker: pickResourceName.bind(null, 4),
};

/**
 * Checks if the given YAML AST node is an AWS Lambda function with the following structure:
 *
 * SomeLambdaFunction:
 *   Type: "AWS::Lambda::Function"
 *   Properties:
 *     Runtime: <nodejs-version>
 *     Code:
 *       ZipFile: <embedded-js-code>
 */
function isInlineAwsLambda(_key: any, pair: any, ancestors: any[]) {
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
 * Checks if the given YAML AST node is an AWS Serverless function with the following structure:
 *
 * SomeServerlessFunction:
 *   Type: "AWS::Serverless::Function"
 *   Properties:
 *     Runtime: <nodejs-version>
 *     InlineCode: <embedded-js-code>
 */
function isInlineAwsServerless(_key: any, pair: any, ancestors: any[]) {
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

/**
 * Picks the embeddedJS resource name for AWS lambdas and serverless functions
 */
export function pickResourceName(level: number, _key: any, _pair: any, ancestors: any) {
  const ancestorsAtResourcesLevel = ancestors[ancestors.length - level];
  return {
    resourceName: ancestorsAtResourcesLevel.key.value,
  };
}
