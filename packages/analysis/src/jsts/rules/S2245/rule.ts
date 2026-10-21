/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S2245/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import { functionLike } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getCurrentFileImports, getFullyQualifiedName } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const CRYPTO_MODULES = new Set([
  'crypto',
  'node:crypto',
  'jsonwebtoken',
  'jose',
  'passport',
  'express-session',
  'cookie-session',
  'crypto-js',
  'node-forge',
  'tweetnacl',
  'sjcl',
  'jsrsasign',
  'elliptic',
  'bcrypt',
  'bcryptjs',
  'argon2',
  'scrypt',
  'pbkdf2',
  'jws',
  'jwt-simple',
  'express-jwt',
  'otplib',
  'speakeasy',
  'next-auth',
]);

const CRYPTO_PREFIXES = ['@noble/', '@aws-crypto/', '@auth/'];

const SECURITY_KEYWORDS = new Set([
  'aes',
  'asymmetric',
  'auth',
  'certificate',
  'chacha20',
  'cipher',
  'crypto',
  'cryptography',
  'decrypt',
  'ecc',
  'encrypt',
  'encryption',
  'hmac',
  'iv',
  'nonce',
  'password',
  'pbkdf2',
  'poly1305',
  'randombytes',
  'rsa',
  'salt',
  'scrypt',
  'secret',
  'secure',
  'security',
  'sessionid',
  'signature',
  'token',
  'verify',
]);

// Parents whose tokens include the name given to an anonymous function (`const generateToken = () => ...`)
const NAMING_PARENTS = new Set([
  'VariableDeclarator',
  'Property',
  'MethodDefinition',
  'PropertyDefinition',
  'AssignmentExpression',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      safeGenerator: 'Make sure that using this pseudorandom number generator is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    let hasCryptoImport: boolean | undefined;

    function importsCrypto() {
      hasCryptoImport ??= [...getCurrentFileImports(sourceCode)].some(
        name => CRYPTO_MODULES.has(name) || CRYPTO_PREFIXES.some(prefix => name.startsWith(prefix)),
      );
      return hasCryptoImport;
    }

    // Splits camelCase/snake_case names into lowercase words and also tries adjacent words joined,
    // so that `sessionId` matches `sessionid` and `randomBytes` matches `randombytes`.
    // ponytail: nested functions' identifiers count toward the outer scope; restrict to the local scope if FPs remain
    function hasSecurityKeyword(scopeNode: Rule.Node) {
      for (const token of sourceCode.getTokens(scopeNode)) {
        if (token.type !== 'Identifier' && token.type !== 'PrivateIdentifier') {
          continue;
        }
        const words = token.value
          .replaceAll(/(?<=[a-z\d])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g, ' ')
          .toLowerCase()
          .split(/[^a-z\d]+/)
          .filter(Boolean);
        if (
          words.some(
            (word, i) =>
              SECURITY_KEYWORDS.has(word) || (i > 0 && SECURITY_KEYWORDS.has(words[i - 1] + word)),
          )
        ) {
          return true;
        }
      }
      return false;
    }

    function isSecurityContext(node: Rule.Node) {
      if (importsCrypto()) {
        return true;
      }
      const fn = findFirstMatchingAncestor(node as TSESTree.Node, n => functionLike.has(n.type)) as
        Rule.Node | undefined;
      const scope =
        fn?.parent && NAMING_PARENTS.has(fn.parent.type) ? fn.parent : (fn ?? sourceCode.ast);
      return hasSecurityKeyword(scope as Rule.Node);
    }

    return {
      CallExpression(node: estree.CallExpression) {
        const fqn = getFullyQualifiedName(context, node);
        if (fqn === 'Math.random' && isSecurityContext(node as Rule.Node)) {
          context.report({
            messageId: 'safeGenerator',
            node,
          });
        }
      },
    };
  },
};
