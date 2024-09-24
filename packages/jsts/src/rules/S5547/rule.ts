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
// https://sonarsource.github.io/rspec/#/rspec/S5547/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, getFullyQualifiedName, getValueOfExpression } from '../helpers/index.ts';
import { meta } from './meta.ts';

const WEAK_CIPHERS = ['bf', 'blowfish', 'des', 'rc2', 'rc4'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
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
