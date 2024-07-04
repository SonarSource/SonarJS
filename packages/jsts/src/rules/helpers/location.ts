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

export function encodeContents(
  message: string,
  secondaryLocations?: IssueLocation[],
  cost?: number,
) {
  return JSON.stringify({
    message,
    secondaryLocations,
    cost,
  });
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
 * @param reportDescriptor the ESLint report descriptor
 * @param secondaryLocations the secondary locations
 * @param cost the optional cost to fix
 * @returns the encoded message with secondary locations
 */
function toEncodedMessage(
  reportDescriptor: Rule.ReportDescriptor,
  secondaryLocations?: IssueLocation[],
  cost?: number,
): Rule.ReportDescriptor {
  if (!('message' in reportDescriptor)) {
    throw new Error(
      'Field "message" is mandatory in the report descriptor for sonar runtime encoding',
    );
  }

  if (reportDescriptor.data === undefined) {
    reportDescriptor.data = {};
  }

  const { message: _, ...rest } = reportDescriptor;
  return {
    ...rest,
    messageId: 'sonarRuntime',
    data: {
      sonarRuntimeData: encodeContents(
        expandMessage(reportDescriptor.message, reportDescriptor.data),
        secondaryLocations,
        cost,
      ),
      ...reportDescriptor.data,
    },
  };
}

export function toSecondaryLocation(startLoc: LocationHolder): IssueLocation;
export function toSecondaryLocation(startLoc: LocationHolder, message: string): IssueLocation;
export function toSecondaryLocation(
  startLoc: LocationHolder,
  endLoc: LocationHolder,
): IssueLocation;
export function toSecondaryLocation(
  startLoc: LocationHolder,
  endLoc: LocationHolder,
  message: string,
): IssueLocation;
export function toSecondaryLocation(
  startLoc: LocationHolder,
  endLoc: string | LocationHolder = startLoc,
  message?: string,
): IssueLocation {
  if (!startLoc.loc) {
    throw new Error('Invalid secondary location');
  }
  const endLocation = typeof endLoc !== 'string' && endLoc.loc ? endLoc.loc : startLoc.loc;
  return {
    message: typeof endLoc === 'string' ? endLoc : message,
    column: startLoc.loc.start.column,
    line: startLoc.loc.start.line,
    endColumn: endLocation.end.column,
    endLine: endLocation.end.line,
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
  secondaryLocations: IssueLocation[] = [],
  cost?: number,
) {
  if ((context.options[context.options.length - 1] as unknown) !== 'sonar-runtime') {
    if ('message' in reportDescriptor && 'messageId' in reportDescriptor) {
      const { message: _, ...rest } = reportDescriptor;
      context.report(rest as ReportDescriptor);
    } else {
      context.report(reportDescriptor);
    }
  } else {
    context.report(toEncodedMessage(reportDescriptor, secondaryLocations, cost));
  }
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
