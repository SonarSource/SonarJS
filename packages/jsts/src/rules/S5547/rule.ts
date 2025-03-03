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
// https://sonarsource.github.io/rspec/#/rspec/S5547/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, getFullyQualifiedName, getValueOfExpression } from '../helpers/index.js';
import * as meta from './meta.js';

const WEAK_CIPHERS = ['bf', 'blowfish', 'des', 'rc2', 'rc4'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      strongerCipher: 'Use a strong cipher algorithm.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const callExpression = node as estree.CallExpression;
        if (getFullyQualifiedName(context, callExpression) === 'crypto.createCipheriv') {
          const algorithm = getValueOfExpression(context, callExpression.arguments[0], 'Literal');
          const algorithmValue = algorithm?.value?.toString().toLowerCase();
          if (
            algorithm &&
            algorithmValue &&
            WEAK_CIPHERS.findIndex(cipher => algorithmValue.startsWith(cipher)) >= 0
          ) {
            context.report({
              messageId: 'strongerCipher',
              node: algorithm,
            });
          }
        }
      },
    };
  },
};
