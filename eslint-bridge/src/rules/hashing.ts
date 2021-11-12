/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4790/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getModuleAndCalledMethod,
  getUniqueWriteUsageOrNode,
  isIdentifier,
  isStringLiteral,
} from '../utils';

const MESSAGE = 'Make sure this weak hash algorithm is not used in a sensitive context here.';
const UNSECURE_HASH_ALGORITHMS = new Set([
  'md4',
  'rsa-md4',
  'md4withrsaencryption',
  'md5',
  'rsa-md5',
  'md5withrsaencryption',
  'ssl2-md5',
  'ssl3-md5',
  'dsa',
  'dsa-sha1',
  'dsa-sha1-old',
  'dss1',
  'dsawithsha1',
  'dss1',
  'ripemd',
  'ripemd160withrsa',
  'ripemd160',
  'rsa-ripemd160',
  'rmd160',
  'rsa-sha1',
  'rsa-sha1-2',
  'sha1',
  'sha1withrsaencryption',
  'ssl3-sha1',
]);

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      'CallExpression[arguments.length > 0]': (node: estree.Node) => {
        const { callee, arguments: args } = node as estree.CallExpression;
        const hashAlgorithm = getUniqueWriteUsageOrNode(context, args[0]);
        if (
          isStringLiteral(hashAlgorithm) &&
          UNSECURE_HASH_ALGORITHMS.has(hashAlgorithm.value.toLocaleLowerCase())
        ) {
          const { module, method } = getModuleAndCalledMethod(callee, context);
          if (module?.value === 'crypto' && isIdentifier(method, 'createHash')) {
            context.report({
              message: MESSAGE,
              node: method,
            });
          }
        }
      },
    };
  },
};
