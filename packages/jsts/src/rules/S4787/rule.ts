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
// https://sonarsource.github.io/rspec/#/rspec/S4787/javascript

import { Rule } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  isIdentifier,
  isMemberWithProperty,
} from '../helpers/index.js';
import { meta } from './meta.js';

const getEncryptionRuleModule = (
  clientSideMethods: string[],
  serverSideMethods: string[],
): Rule.RuleModule => ({
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      safeEncryption: 'Make sure that encrypting data is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    // for client side
    let usingCryptoInFile = false;

    return {
      Program() {
        // init flag for each file
        usingCryptoInFile = false;
      },

      MemberExpression(node: estree.Node) {
        // detect 'SubtleCrypto' object
        // which can be retrieved by 'crypto.subtle' or 'window.crypto.subtle'
        const { object, property } = node as estree.MemberExpression;
        if (
          isIdentifier(property, 'subtle') &&
          (isIdentifier(object, 'crypto') || isMemberWithProperty(object, 'crypto'))
        ) {
          usingCryptoInFile = true;
        }
      },

      'CallExpression:exit'(node: estree.Node) {
        const { callee } = node as estree.CallExpression;

        if (usingCryptoInFile) {
          // e.g.: crypto.subtle.encrypt()
          checkForClientSide(callee, context, clientSideMethods);
        }

        // e.g.
        // const crypto = require("crypto");
        // const cipher = crypto.createCipher(alg, key);
        checkForServerSide(callee, context, serverSideMethods);
      },
    };
  },
});

function checkForServerSide(
  callee: estree.Node,
  context: Rule.RuleContext,
  serverSideMethods: string[],
) {
  const fqn = getFullyQualifiedName(context, callee);
  if (serverSideMethods.some(method => fqn === `crypto.${method}`)) {
    context.report({
      messageId: 'safeEncryption',
      node: callee,
    });
  }
}

function checkForClientSide(
  callee: estree.Node,
  context: Rule.RuleContext,
  clientSideMethods: string[],
) {
  if (
    isIdentifier(callee, ...clientSideMethods) ||
    isMemberWithProperty(callee, ...clientSideMethods)
  ) {
    context.report({
      messageId: 'safeEncryption',
      node: callee,
    });
  }
}

const clientSideEncryptMethods = ['encrypt', 'decrypt'];
const serverSideEncryptMethods = [
  'createCipher',
  'createCipheriv',
  'createDecipher',
  'createDecipheriv',
  'publicEncrypt',
  'publicDecrypt',
  'privateEncrypt',
  'privateDecrypt',
];

export const rule: Rule.RuleModule = getEncryptionRuleModule(
  clientSideEncryptMethods,
  serverSideEncryptMethods,
);
