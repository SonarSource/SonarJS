/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S2077/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, getFullyQualifiedName } from '../helpers/index.js';
import * as meta from './generated-meta.js';

// Dictionary with fully qualified names of functions and indices of their
// parameters to analyze for hardcoded credentials.
const secretSignatures: Record<string, [number]> = {
  'crypto.createHmac': [1],
  'crypto.createSecretKey': [0],
  'crypto.encapsulate': [0],
  'crypto.sign': [0],
  'crypto.X509Certificate': [0],
  'crypto.sign.sign': [0],
  'crypto.ecdh.setPrivateKey': [0],
  'crypto.diffieHellman.setPrivateKey': [0],
  'crypto.verify': [2],
  'crypto.privateEncrypt': [0],
  'crypto.privateDecrypt': [0],
  'crypto.scrypt': [0],
  'crypto.scryptSync': [0],
  'crypto.pbkdf2': [0],
  'crypto.pbkdf2Sync': [0],
  'sequelize.Sequelize': [1],
  superagent: [0],
  'cookie-parser': [0],
  'cookie-parser.signedCookie': [1],
  'cookie-parser.signedCookies': [1],
  'jsonwebtoken.sign': [1],
  'jsonwebtoken.verify': [1],
  'jwt.sign': [1],
  'jwt.verify': [1],
  'jose.SignJWT': [0],
  'jose.jwtVerify': [1],
  'node-jose.JWK.asKey': [0],
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      secretSignature: `Revoke and change this password, as it is compromised.`,
    },
  }),

  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpression);

        if (
          fqn &&
          secretSignatures.hasOwnProperty(fqn) &&
          secretSignatures[fqn].every(index => containsHardcodedCredentials(callExpression, index))
        ) {
          context.report({
            messageId: 'secretSignature',
            node: callExpression.callee,
          });
        }
      },
    };
  },
};

function containsHardcodedCredentials(node: estree.CallExpression, index = 0): boolean {
  const args = node.arguments;
  const arg = args[index] as estree.Expression | estree.SpreadElement | undefined;

  if (!arg || arg.type === 'SpreadElement') {
    return false;
  }

  return arg.type === 'Literal' || (arg.type === 'TemplateLiteral' && arg.expressions.length === 0);
}
