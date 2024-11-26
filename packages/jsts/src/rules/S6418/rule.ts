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
  isIdentifier,
  isLogicalExpression,
  isStringLiteral,
} from '../helpers/index.js';
import { meta } from './meta.js';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { FromSchema } from 'json-schema-to-ts';
import { TSESTree } from '@typescript-eslint/utils';

const DEFAULT_SECRET_WORDS = 'api[_.-]?key,auth,credential,secret,token';
const DEFAULT_RANDOMNESS_SENSIBILITY = 5.0;
const POSTVALIDATION_PATTERN =
  /[a-zA-Z0-9_.+/~$-]([a-zA-Z0-9_.+/=~$-]|\\\\\\\\(?![ntr"])){14,1022}[a-zA-Z0-9_.+/=~$-]/;

function message(name: string): string {
  return `"${name}" detected here, make sure this is not a hard-coded secret.`;
}

let randomnessSensibility: number;
let secretWordRegexps: RegExp[];

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
    { schema },
    false /* true if secondary locations */,
  ),
  create(context: Rule.RuleContext) {
    // get typed rule options with FromSchema helper
    const secretWords =
      (context.options as FromSchema<typeof schema>)[0]?.['secret-words'] ?? DEFAULT_SECRET_WORDS;
    secretWordRegexps = buildSecretWordRegexps(secretWords);
    randomnessSensibility =
      (context.options as FromSchema<typeof schema>)[0]?.['randomness-sensibility'] ??
      DEFAULT_RANDOMNESS_SENSIBILITY;

    return {
      AssignmentExpression(node) {
        handleAssignmentExpression(context, node as TSESTree.AssignmentExpression);
      },
      AssignmentPattern(node) {
        handleAssignmentPattern(context, node as TSESTree.AssignmentPattern);
      },
      Property(node) {
        handlePropertyAndPropertyDefinition(context, node as TSESTree.Property);
      },
      PropertyDefinition(node) {
        handlePropertyAndPropertyDefinition(context, node as TSESTree.PropertyDefinition);
      },
      VariableDeclarator(node) {
        handleVariableDeclarator(context, node as TSESTree.VariableDeclarator);
      },
    };
  },
};

function handleAssignmentExpression(
  context: Rule.RuleContext,
  node: TSESTree.AssignmentExpression,
) {
  const keySuspect = findKeySuspect(node.left);
  const ValueSuspect = findValueSuspect(extractDefaultOperatorIfNeeded(node));
  if (keySuspect && ValueSuspect) {
    context.report({
      node: node.right as TSESTree.Literal,
      message: message(keySuspect),
    });
  }
  function extractDefaultOperatorIfNeeded(node: TSESTree.AssignmentExpression): TSESTree.Node {
    const defaultOperators = ['??', '||'];
    if (isLogicalExpression(node.right) && defaultOperators.includes(node.right.operator)) {
      return node.right.right;
    } else {
      return node.right;
    }
  }
}
function handleAssignmentPattern(context: Rule.RuleContext, node: TSESTree.AssignmentPattern) {
  const keySuspect = findKeySuspect(node.left);
  const ValueSuspect = findValueSuspect(node.right);
  if (keySuspect && ValueSuspect) {
    context.report({
      node: node.right as TSESTree.Literal,
      message: message(keySuspect),
    });
  }
}
function handlePropertyAndPropertyDefinition(
  context: Rule.RuleContext,
  node: TSESTree.Property | TSESTree.PropertyDefinition,
) {
  const keySuspect = findKeySuspect(node.key);
  const ValueSuspect = findValueSuspect(node.value);
  if (keySuspect && ValueSuspect) {
    context.report({
      node: node.value as TSESTree.Literal,
      message: message(keySuspect),
    });
  }
}
function handleVariableDeclarator(context: Rule.RuleContext, node: TSESTree.VariableDeclarator) {
  const keySuspect = findKeySuspect(node.id);
  const ValueSuspect = findValueSuspect(node.init);
  if (keySuspect && ValueSuspect) {
    context.report({
      node: node.init as TSESTree.Literal,
      message: message(keySuspect),
    });
  }
}

function findKeySuspect(node: TSESTree.Node): string | undefined {
  if (isIdentifier(node) && secretWordRegexps.some(pattern => pattern.test(node.name))) {
    return node.name;
  } else {
    return undefined;
  }
}

function findValueSuspect(node: TSESTree.Node | undefined | null): TSESTree.Node | undefined {
  if (
    node &&
    isStringLiteral(node) &&
    valuePassesPostValidation(node.value) &&
    entropyShouldRaise(node.value)
  ) {
    return node;
  } else {
    return undefined;
  }
}

function valuePassesPostValidation(value: string): boolean {
  return POSTVALIDATION_PATTERN.test(value);
}

function buildSecretWordRegexps(secretWords: string) {
  return secretWords.split(',').map(word => new RegExp(`(${word})`, 'i'));
}

function entropyShouldRaise(value: string): boolean {
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
