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
// https://sonarsource.github.io/rspec/#/rspec/S4790/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getUniqueWriteUsageOrNode,
  isStringLiteral,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const message = 'Make sure this weak hash algorithm is not used in a sensitive context here.';
const CRYPTO_UNSECURE_HASH_ALGORITHMS = new Set([
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
const SUBTLE_UNSECURE_HASH_ALGORITHMS = new Set(['sha-1']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    function checkNodejsCrypto(fqn: string | null, node: estree.CallExpression) {
      // crypto#createHash
      const { callee, arguments: args } = node;
      if (fqn === 'crypto.createHash') {
        checkUnsecureAlgorithm(callee, args[0], CRYPTO_UNSECURE_HASH_ALGORITHMS);
      }
    }

    function checkSubtleCrypto(fqn: string | null, node: estree.CallExpression) {
      // crypto.subtle#digest
      const { callee, arguments: args } = node;
      if (fqn === 'crypto.subtle.digest') {
        checkUnsecureAlgorithm(callee, args[0], SUBTLE_UNSECURE_HASH_ALGORITHMS);
      }
    }

    function checkUnsecureAlgorithm(
      method: estree.Node,
      hash: estree.Node,
      unsecureAlgorithms: Set<string>,
    ) {
      const hashAlgorithm = getUniqueWriteUsageOrNode(context, hash);
      if (
        isStringLiteral(hashAlgorithm) &&
        unsecureAlgorithms.has(hashAlgorithm.value.toLocaleLowerCase())
      ) {
        context.report({
          message,
          node: method,
        });
      }
    }

    return {
      'CallExpression[arguments.length > 0]': (node: estree.Node) => {
        const callExpr = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpr);
        checkNodejsCrypto(fqn, callExpr);
        checkSubtleCrypto(fqn, callExpr);
      },
    };
  },
};
