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
// https://sonarsource.github.io/rspec/#/rspec/S7639/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, isMemberWithProperty, isRequireModule } from '../helpers/index.js';

const BLOCKCHAIN_MODULES = ['ethers', 'viem/accounts', 'tronweb'];

const MNEMONIC_FUNCTIONS = ['fromPhrase', 'mnemonicToAccount', 'fromMnemonic'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      reviewBlockchainSeedPhrase: `Revoke and change this seed phrase, as it is compromised.`,
    },
  }),
  create(context: Rule.RuleContext) {
    let isBlockchainModuleImported = false;

    function isHardcodedString(expr: estree.Expression): boolean {
      switch (expr.type) {
        case 'Literal':
          return typeof expr.value === 'string';
        case 'TemplateLiteral':
          return expr.expressions.length === 0;
        case 'BinaryExpression':
          return expr.operator === '+' && 
                 isHardcodedString(expr.left) && 
                 isHardcodedString(expr.right);
        default:
          return false;
      }
    }

    function isMnemonicFunction(callee: estree.Expression | estree.Super): boolean {
      return MNEMONIC_FUNCTIONS.some(func => isMemberWithProperty(callee, func));
    }

    return {
      Program() {
        isBlockchainModuleImported = false;
      },

      ImportDeclaration(node: estree.ImportDeclaration) {
        if (BLOCKCHAIN_MODULES.includes(node.source.value as any)) {
          isBlockchainModuleImported = true;
        }
      },

      CallExpression(node: estree.CallExpression) {
        // Check for require() calls
        if (isRequireModule(node, ...BLOCKCHAIN_MODULES)) {
          isBlockchainModuleImported = true;
          return;
        }

        // Report hardcoded seed phrases in mnemonic functions
        if (
          isBlockchainModuleImported &&
          isMnemonicFunction(node.callee) &&
          node.arguments.length > 0 &&
          node.arguments[0].type !== 'SpreadElement' &&
          isHardcodedString(node.arguments[0])
        ) {
          context.report({
            messageId: 'reviewBlockchainSeedPhrase',
            node: node.arguments[0],
          });
        }
      },
    };
  },
};
