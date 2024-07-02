/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import * as estree from 'estree';
import { AST, Rule } from 'eslint';
import RuleContext = Rule.RuleContext;
import ReportDescriptor = Rule.ReportDescriptor;
import { TSESLint, TSESTree } from '@typescript-eslint/utils';

export type LocationHolder = AST.Token | TSESTree.Node | estree.Node | { loc: AST.SourceLocation };

export interface IssueLocation {
  column: number;
  line: number;
  endColumn: number;
  endLine: number;
  message?: string;
  data?: Record<string, unknown>;
}

export interface EncodedMessage {
  message: string;
  cost?: number;
  secondaryLocations: IssueLocation[];
}

/**
 * Encodes an ESLint descriptor message with secondary locations
 *
 * The encoding consists in stringifying a JavaScript object with
 * `JSON.stringify` that includes the ESLint's descriptor message
 * along with second location information: message and location.
 *
 * This encoded message is eventually decoded by the linter wrapper
 * on the condition that the rule definition of the flagged problem
 * defines the internal `sonar-runtime` parameter in its schema.
 *
 * @param message the ESLint descriptor message
 * @param secondaryLocationsHolder the secondary locations
 * @param secondaryMessages the messages for each secondary location
 * @param cost the optional cost to fix
 * @returns the encoded message with secondary locations
 */
export function toEncodedMessage(
  message: string,
  secondaryLocationsHolder: Array<LocationHolder> = [],
  secondaryMessages?: (string | undefined)[],
  cost?: number,
): string {
  const encodedMessage: EncodedMessage = {
    message,
    cost,
    secondaryLocations: secondaryLocationsHolder.map((locationHolder, index) =>
      toSecondaryLocation(
        locationHolder,
        !!secondaryMessages ? secondaryMessages[index] : undefined,
      ),
    ),
  };
  return JSON.stringify(encodedMessage);
}

function toSecondaryLocation(locationHolder: LocationHolder, message?: string): IssueLocation {
  if (!locationHolder.loc) {
    throw new Error('Invalid secondary location');
  }
  return {
    message,
    column: locationHolder.loc.start.column,
    line: locationHolder.loc.start.line,
    endColumn: locationHolder.loc.end.column,
    endLine: locationHolder.loc.end.line,
  };
}

/**
 * Wrapper for `context.report`, supporting secondary locations and cost.
 * Encode those extra information in the issue message when rule is executed
 * in Sonar* environment.
 */
export function report(
  context: RuleContext,
  reportDescriptor: ReportDescriptor,
  secondaryLocations: IssueLocation[],
  message: string,
  cost?: number,
) {
  if ((context.options[context.options.length - 1] as unknown) !== 'sonar-runtime') {
    context.report(reportDescriptor);
    return;
  }

  const encodedMessage: EncodedMessage = {
    secondaryLocations,
    message: expandMessage(message, reportDescriptor.data),
    cost,
  };

  if (reportDescriptor.data === undefined) {
    reportDescriptor.data = {};
  }

  context.report({
    ...reportDescriptor,
    messageId: 'sonarRuntime',
    data: {
      sonarRuntimeData: JSON.stringify(encodedMessage),
      ...reportDescriptor.data,
    },
  });
}

function expandMessage(message: string, reportDescriptorData: Record<string, unknown> | undefined) {
  let expandedMessage = message;
  if (reportDescriptorData !== undefined) {
    for (const [key, value] of Object.entries(reportDescriptorData)) {
      expandedMessage = replaceAll(expandedMessage, `{{${key}}}`, (value as object).toString());
    }
  }

  return expandedMessage;
}

function replaceAll(target: string, search: string, replacement: string): string {
  return target.split(search).join(replacement);
}

/**
 * Returns a location of the "main" function token:
 * - function name for a function declaration, method or accessor
 * - "function" keyword for a function expression
 * - "=>" for an arrow function
 */
export function getMainFunctionTokenLocation<T = string>(
  fn: TSESTree.FunctionLike,
  parent: TSESTree.Node | undefined,
  context: TSESLint.RuleContext<string, T[]>,
) {
  let location: TSESTree.SourceLocation | null | undefined;

  if (fn.type === 'FunctionDeclaration') {
    // `fn.id` can be null when it is `export default function` (despite of the @types/TSESTree definition)
    if (fn.id) {
      location = fn.id.loc;
    } else {
      const token = getTokenByValue(fn, 'function', context);
      location = token && token.loc;
    }
  } else if (fn.type === 'FunctionExpression') {
    if (parent && (parent.type === 'MethodDefinition' || parent.type === 'Property')) {
      location = parent.key.loc;
    } else {
      const token = getTokenByValue(fn, 'function', context);
      location = token && token.loc;
    }
  } else if (fn.type === 'ArrowFunctionExpression') {
    const token = context.sourceCode
      .getTokensBefore(fn.body)
      .reverse()
      .find(token => token.value === '=>');

    location = token && token.loc;
  }

  return location!;
}

/**
 * Converts `SourceLocation` range into `IssueLocation`
 */
export function issueLocation(
  startLoc: estree.SourceLocation,
  endLoc: estree.SourceLocation = startLoc,
  message = '',
  data: Record<string, unknown> = {},
): IssueLocation {
  const issueLocation: IssueLocation = {
    line: startLoc.start.line,
    column: startLoc.start.column,
    endLine: endLoc.end.line,
    endColumn: endLoc.end.column,
    message,
  };

  if (data !== undefined && Object.keys(data).length > 0) {
    issueLocation.data = data;
  }

  return issueLocation;
}

function getTokenByValue<T = string>(
  node: TSESTree.Node,
  value: string,
  context: TSESLint.RuleContext<string, T[]>,
) {
  return context.sourceCode.getTokens(node).find(token => token.value === value);
}

export function getFirstTokenAfter<T = string>(
  node: TSESTree.Node,
  context: TSESLint.RuleContext<string, T[]>,
): TSESLint.AST.Token | null {
  return context.sourceCode.getTokenAfter(node);
}

export function getFirstToken<T = string>(
  node: TSESTree.Node,
  context: TSESLint.RuleContext<string, T[]>,
): TSESLint.AST.Token {
  return context.sourceCode.getTokens(node)[0];
}
