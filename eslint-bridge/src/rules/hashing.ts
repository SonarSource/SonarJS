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
  'md2',
  'md4',
  'md5',
  'md6',
  'haval128',
  'hmacmd5',
  'dsa',
  'ripemd',
  'ripemd128',
  'ripemd160',
  'hmacripemd160',
  'sha1',
]);

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      'CallExpression[arguments.length > 0]': (node: estree.Node) => {
        const { callee, arguments: args } = node as estree.CallExpression;
        const { module, method } = getModuleAndCalledMethod(callee, context);
        if (module?.value === 'crypto' && isIdentifier(method, 'createHash')) {
          const hashAlgorithm = getUniqueWriteUsageOrNode(context, args[0]);
          if (
            isStringLiteral(hashAlgorithm) &&
            UNSECURE_HASH_ALGORITHMS.has(hashAlgorithm.value.toLocaleLowerCase())
          ) {
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
