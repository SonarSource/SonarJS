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
import { generateMeta, isRequiredParserServices, isStringLiteral } from '../helpers/index.js';
import { meta } from './meta.js';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { FromSchema } from 'json-schema-to-ts';
import estree from 'estree';

const messages = {
  //TODO: add needed messages
  messageId: 'message body',
};

const DEFAULT_SECRET_WORDS = 'api[_.-]?key,auth,credential,secret,token';
const DEFAULT_RANDOMNESS_SENSIBILITY = 3.0;
const POSTVALIDATION_PATTERN = new RegExp(
  '[a-zA-Z0-9_.+/~$-]([a-zA-Z0-9_.+/=~$-]|\\\\\\\\(?![ntr"])){14,1022}[a-zA-Z0-9_.+/=~$-]',
);

function message(name: string): string {
  return `"${name}" detected here, make sure this is not a hard-coded secret.`;
}

let secretWords: string;
let randomnessSensibility: number;
let patterns: RegExp[] | null = null;

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
    };
  },
};

function handleStringLiteral(context: Rule.RuleContext, node: estree.Literal) {
  const value = node.value as string;
  patternMatch(context, node, value);
}

function patternMatch(context: Rule.RuleContext, node: estree.Literal, value: string) {
  if (!valuePassesPostValidation(value) || !enthropyShouldRaise(value)) {
    return;
  }
  getPatterns();
  //getPatterns().map(pattern => {
  //if (pattern.test(value)) {
  context.report({
    node,
    message: message(value),
  });
  //}
  //});
}

function valuePassesPostValidation(value: string): boolean {
  return POSTVALIDATION_PATTERN.test(value);
}

function getPatterns() {
  if (patterns === null) {
    patterns = secretWords.split(',').map(word => new RegExp(`(${word})`, 'i'));
  }
  return patterns;
}

function enthropyShouldRaise(value: string): boolean {
  return ShannonEntropy.calculate(value) > randomnessSensibility;
}

const ShannonEntropy = {
  calculate: (str: string): number => {
    if (!str) {
      return 0;
    }
    const lettersTotal = str.length;
    const occurences: Record<string, number> = {};
    for (const letter of [...str]) {
      occurences[letter] = (occurences[letter] ?? 0) + 1;
    }
    const values = Object.values(occurences);
    const entropy =
      values
        .map(count => count / lettersTotal)
        .map(frequency => -frequency * Math.log(frequency))
        .reduce((acc, entropy) => acc + entropy, 0) / Math.log(2);
    return entropy;
  },
};
