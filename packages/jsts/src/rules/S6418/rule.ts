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
// https://sonarsource.github.io/rspec/#/rspec/S6418/javascript

import type { Rule } from 'eslint';
import {
  generateMeta,
  isRequiredParserServices,
  isStringLiteral,
  report,
} from '../helpers/index.js';
import { meta } from './meta.js';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { FromSchema } from 'json-schema-to-ts';
import estree from 'estree';

const messages = {
  //TODO: add needed messages
  messageId: 'message body',
};

const DEFAULT_SECRET_WORDS = 'api[_.-]?key,auth,credential,secret,token';
const DEFAULT_RANDOMNESS_SENSIBILITY = 5.0;
const MINIMUM_CREDENTIAL_LENGTH = 17;

const FIRST_ACCEPTED_CHARACTER = '[\\w.+/~$:&-]';
const FOLLOWING_ACCEPTED_CHARACTER = '[=\\w.+/~$:&-]';
const SECRET_PATTERN = new RegExp(
  FIRST_ACCEPTED_CHARACTER +
    '(' +
    FOLLOWING_ACCEPTED_CHARACTER +
    '|\\\\\\\\' +
    FOLLOWING_ACCEPTED_CHARACTER +
    ')++',
);

const IP_V6_WITH_FIRST_PART = '(\\p{XDigit}{1,4}::?){1,7}\\p{XDigit}{0,4}';
const IP_V6_WITHOUT_FIRST_PART = '::((\\p{XDigit}{1,4}:){0,6}\\p{XDigit}{1,4})?';
const IP_V6_ALONE = '(?<ip>' + IP_V6_WITH_FIRST_PART + '|' + IP_V6_WITHOUT_FIRST_PART + ')';
const IPV_6_PATTERN = new RegExp(IP_V6_ALONE);

let secretWords: string;
let randomnessSensibility: number;
let variablePatterns: Array<RegExp>;
let literalPatterns: Array<RegExp>;

const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 1,
  items: [
    {
      type: 'object',
      properties: {
        'secret-words': {
          type: 'string',
        },
        'randomness-sensibility': {
          type: 'number',
        },
      },
      additionalProperties: false,
    },
  ],
} as const satisfies JSONSchema4;

export const rule: Rule.RuleModule = {
  meta: generateMeta(
    meta as Rule.RuleMetaData,
    { schema, messages },
    false /* true if secondary locations */,
  ),
  create(context: Rule.RuleContext) {
    // get typed rule options with FromSchema helper
    secretWords =
      (context.options as FromSchema<typeof schema>)[0]?.['secret-words'] ?? DEFAULT_SECRET_WORDS;
    randomnessSensibility =
      (context.options as FromSchema<typeof schema>)[0]?.['randomness-sensibility'] ??
      DEFAULT_RANDOMNESS_SENSIBILITY;
    const services = context.parserServices;

    // remove this condition if the rule does not depend on TS type-checker
    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      Literal(node: estree.Literal) {
        if (!isStringLiteral(node)) {
          return;
        }
        handleStringLiteral(context, node);
      },
      Identifier(node: estree.Identifier) {
        handleIdentifier(context, node);
      },
      AssignmentExpression(node: estree.AssignmentExpression) {
        handleAssignmentExpression(context, node);
      },
      CallExpression(node: estree.CallExpression) {
        handleCallExpression(context, node);
      },
    };
  },
};

function handleStringLiteral(context: Rule.RuleContext, node: estree.Literal) {
  if (!isPartOfConstantCredentialDeclaration(node)) {
    const toReport = getLiteralPatterns()
      .map(pattern => pattern.exec(node.value as string))
      .filter(result => !isExcludedLiteral(result?.[1]));
    if (toReport) {
      report(context, {
        node,
        message: generateMessage(toReport[0]),
      });
    }
  }
}
function isExcludedLiteral(value: string | undefined): boolean {
  return value === undefined || value.length < MINIMUM_CREDENTIAL_LENGTH;
}

function getLiteralPatterns(): Array<RegExp> {
  if (literalPatterns === undefined) {
    literalPatterns = toPatterns('=\\s*+([^\\\\ &;#,|]+)');
  }
  return literalPatterns;
}

function isPartOfConstantCredentialDeclaration(node: estree.Literal): boolean {
  return (node as any).parent.type === 'VariableDeclarator' && isCredentialVariableName(node);
}

function isCredentialVariableName(node: estree.Identifier): boolean {
  return isCredentialLikeName(node.name);
}
function isCredentialLikeName(name: string): boolean {
  return getVariablePatterns()
    .map(pattern => pattern.exec(name))
    .map(result => result?.[0])
    .some(element => element !== undefined);
}
function getVariablePatterns(): Array<RegExp> {
  if (variablePatterns === undefined) {
    variablePatterns = toPatterns('');
  }
  return variablePatterns;
}
function toPatterns(suffix: string): Array<RegExp> {
  return getCredentialWords()
    .split(',')
    .map(e => e.trim())
    .map(word => new RegExp(`(${word})${suffix}`, 'i'));
}
function getCredentialWords(): string {
  return secretWords;
}

function handleIdentifier(context: Rule.RuleContext, node: estree.Identifier) {
  if (node.name === 'secret') {
    report(context, {
      node,
      message: 'Hard-coded secrets are security-sensitive',
    });
  }
}

function handleAssignmentExpression(context: Rule.RuleContext, node: estree.AssignmentExpression) {
  if (node.left.type === 'Identifier' && node.left.name === 'secret') {
    report(context, {
      node,
      message: 'Hard-coded secrets are security-sensitive',
    });
  }
}

function generateMessage(match: string): string {
  return `'${match}' detected in this expression, review this potentially hard-coded secret.`;
}

function handleCallExpression(context: Rule.RuleContext, node: estree.CallExpression) {
  const credential = findSettingCredential(node);
  if (credential) {
    report(context, {
      node,
      message: generateMessage(credential.value as string),
    });
  }
}

const ALLOW_LIST = new Set(['anonymous']);

function findSettingCredential(node: estree.CallExpression): estree.Literal | undefined {
  const args = node.arguments;
  if (
    args.length === 2 &&
    areStrings(args) &&
    isPotenticalCredential(args[1] as estree.Literal) &&
    !isCredentialContainingPattern(args[1] as estree.Literal)
  ) {
    return args[0] as estree.Literal;
  }

  function areStrings(args: estree.Node[]): boolean {
    return args.every(isStringLiteral);
  }
}

function isCredentialContainingPattern(node: estree.Literal): boolean {
  return false;
}

function isPotenticalCredential(node: estree.Literal): boolean {
  if (!isStringLiteral(node)) {
    return false;
  }
  const trimmed = node.value.trim();
  return trimmed.length >= MINIMUM_CREDENTIAL_LENGTH && !ALLOW_LIST.has(trimmed);
}
