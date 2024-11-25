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
  isRequiredParserServices,
  isStringLiteral,
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
      AssignmentExpression(node: estree.AssignmentExpression) {
        handleAssignmentExpression(context, node);
      },
      VariableDeclarator(node: estree.VariableDeclarator) {
        handleVariableDeclarator(context, node);
      },
      Property(node: estree.Property) {
        handleProperty(context, node);
      },
      AssignmentPattern(node: estree.AssignmentPattern) {
        handleAssignmentPattern(context, node);
      },
      PropertyDefinition(node: estree.PropertyDefinition) {
        handlePropertyDefinition(context, node);
      },
    };
  },
};

function handleAssignmentPattern(context: Rule.RuleContext, node: estree.AssignmentPattern) {
  const keySuspect = findKeySuspect(node.left);
  const ValueSuspect = findValueSuspect(node.right);
  if (keySuspect && ValueSuspect) {
    context.report({
      node: node.right as estree.Literal,
      message: message(keySuspect as string),
    });
  }
}

function handleProperty(context: Rule.RuleContext, node: estree.Property) {
  const keySuspect = findKeySuspect(node.key);
  const ValueSuspect = findValueSuspect(node.value);
  if (keySuspect && ValueSuspect) {
    context.report({
      node: node.value as estree.Literal,
      message: message(keySuspect as string),
    });
  }
}

function handlePropertyDefinition(context: Rule.RuleContext, node: estree.PropertyDefinition) {
  const keySuspect = findKeySuspect(node.key);
  const ValueSuspect = findValueSuspect(node.value);
  if (keySuspect && ValueSuspect) {
    context.report({
      node: node.value as estree.Literal,
      message: message(keySuspect as string),
    });
  }
}

function handleVariableDeclarator(context: Rule.RuleContext, node: estree.VariableDeclarator) {
  const keySuspect = findKeySuspect(node.id);
  const ValueSuspect = findValueSuspect(node.init);
  if (keySuspect && ValueSuspect) {
    context.report({
      node: node.init as estree.Literal,
      message: message(keySuspect as string),
    });
  }
}

function handleAssignmentExpression(context: Rule.RuleContext, node: estree.AssignmentExpression) {
  const keySuspect = findKeySuspect(node.left);
  const ValueSuspect = findValueSuspect(node.right);
  if (keySuspect && ValueSuspect) {
    context.report({
      node: node.right,
      message: message(keySuspect as string),
    });
  }
}

function findKeySuspect(node: estree.Node): string | undefined {
  let name: string;
  if (isIdentifier(node)) {
    name = node.name;
  } else {
    return undefined;
  }
  if (getPatterns().some(pattern => pattern.test(name))) {
    return name;
  }
  return undefined;
}
function findValueSuspect(node: estree.Node | null | undefined): estree.Node | undefined {
  if (!node) {
    return undefined;
  }
  let value;
  if (isStringLiteral(node)) {
    value = node.value;
  } else {
    return undefined;
  }
  if (valuePassesPostValidation(value) && enthropyShouldRaise(value)) {
    return node;
  }
  return undefined;
}

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
