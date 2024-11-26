/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
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
import { error } from '../../../../shared/src/helpers/logging.js';
import estree from 'estree';

const DEFAULT_SECRET_WORDS = 'api[_.-]?key,auth,credential,secret,token';
const DEFAULT_RANDOMNESS_SENSIBILITY = 3.0;
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
        secretWords: {
          type: 'string',
        },
        randomnessSensibility: {
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
      (context.options as FromSchema<typeof schema>)[0]?.['secretWords'] ?? DEFAULT_SECRET_WORDS;
    secretWordRegexps = buildSecretWordRegexps(secretWords);
    randomnessSensibility =
      (context.options as FromSchema<typeof schema>)[0]?.['randomnessSensibility'] ??
      DEFAULT_RANDOMNESS_SENSIBILITY;

    return {
      AssignmentExpression(node) {
        handleAssignmentExpression(context, node);
      },
      AssignmentPattern(node) {
        handleAssignmentPattern(context, node);
      },
      Property(node) {
        handlePropertyAndPropertyDefinition(context, node);
      },
      PropertyDefinition(node) {
        handlePropertyAndPropertyDefinition(context, node);
      },
      VariableDeclarator(node) {
        handleVariableDeclarator(context, node);
      },
    };
  },
};

function handleAssignmentExpression(context: Rule.RuleContext, node: estree.AssignmentExpression) {
  const keySuspect = findKeySuspect(node.left);
  const valueSuspect = findValueSuspect(extractDefaultOperatorIfNeeded(node));
  if (keySuspect && valueSuspect) {
    context.report({
      node: node.right,
      message: message(keySuspect),
    });
  }
  function extractDefaultOperatorIfNeeded(node: estree.AssignmentExpression): estree.Node {
    const defaultOperators = ['??', '||'];
    if (isLogicalExpression(node.right) && defaultOperators.includes(node.right.operator)) {
      return node.right.right;
    } else {
      return node.right;
    }
  }
}
function handleAssignmentPattern(context: Rule.RuleContext, node: estree.AssignmentPattern) {
  const keySuspect = findKeySuspect(node.left);
  const valueSuspect = findValueSuspect(node.right);
  if (keySuspect && valueSuspect) {
    context.report({
      node: node.right,
      message: message(keySuspect),
    });
  }
}
function handlePropertyAndPropertyDefinition(
  context: Rule.RuleContext,
  node: estree.Property | estree.PropertyDefinition,
) {
  const keySuspect = findKeySuspect(node.key);
  const valueSuspect = findValueSuspect(node.value);
  if (keySuspect && valueSuspect) {
    context.report({
      node: node.value as estree.Literal,
      message: message(keySuspect),
    });
  }
}
function handleVariableDeclarator(context: Rule.RuleContext, node: estree.VariableDeclarator) {
  const keySuspect = findKeySuspect(node.id);
  const valueSuspect = findValueSuspect(node.init);
  if (keySuspect && valueSuspect) {
    context.report({
      node: node.init as estree.Literal,
      message: message(keySuspect),
    });
  }
}

function findKeySuspect(node: estree.Node): string | undefined {
  if (isIdentifier(node) && secretWordRegexps.some(pattern => pattern.test(node.name))) {
    return node.name;
  } else {
    return undefined;
  }
}

function findValueSuspect(node: estree.Node | undefined | null): estree.Node | undefined {
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
  try {
    return secretWords.split(',').map(word => new RegExp(`(${word})`, 'i'));
  } catch (e) {
    error(
      `Invalid characters provided to rule S6418 'hardcoded-secrets' parameter "secretWords": "${secretWords}" falling back to default: "${DEFAULT_SECRET_WORDS}". Error: ${e}`,
    );
    return buildSecretWordRegexps(DEFAULT_SECRET_WORDS);
  }
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
    return (
      values
        .map(count => count / lettersTotal)
        .map(frequency => -frequency * Math.log(frequency))
        .reduce((acc, entropy) => acc + entropy, 0) / Math.log(2)
    );
  },
};
