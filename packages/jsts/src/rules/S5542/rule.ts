/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5542/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, getFullyQualifiedName, getValueOfExpression } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const aliases: string[] = [
  'AES128',
  'AES192',
  'AES256',
  'BF',
  'blowfish',
  'CAMELLIA128',
  'CAMELLIA192',
  'CAMELLIA256',
  'CAST',
  'DES',
  'DES-EDE',
  'DES-EDE3',
  'DES3',
  'DESX',
  'RC2',
  'RC2-40',
  'RC2-64',
  'RC2-128',
  'SEED',
];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      useSecureMode: 'Use a secure mode and padding scheme.',
    },
  }),
  create(context: Rule.RuleContext) {
    const patterns: RegExp[] = [/CBC/i, /ECB/i];
    for (const alias of aliases) {
      patterns.push(new RegExp(`^${alias}$`, 'i'));
    }
    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        if (getFullyQualifiedName(context, callExpression) !== 'crypto.createCipheriv') {
          return;
        }
        const sensitiveArgument = callExpression.arguments[0];
        const sensitiveArgumentValue = getValueOfExpression(context, sensitiveArgument, 'Literal');
        if (!sensitiveArgumentValue) {
          return;
        }
        const { value } = sensitiveArgumentValue;
        if (typeof value !== 'string') {
          return;
        }
        if (patterns.some(pattern => pattern.test(value))) {
          context.report({
            messageId: 'useSecureMode',
            node: sensitiveArgument,
          });
        }
      },
    };
  },
};
