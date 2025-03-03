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
// https://sonarsource.github.io/rspec/#/rspec/S4787/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  isIdentifier,
  isMemberWithProperty,
} from '../helpers/index.js';
import * as meta from './meta.js';

const getEncryptionRuleModule = (
  clientSideMethods: string[],
  serverSideMethods: string[],
): Rule.RuleModule => ({
  meta: generateMeta(meta, {
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
