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
import * as meta from './generated-meta.js';

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
    const hardcodedVariables = new Map<string, estree.Node>();

    function isHardcodedString(expr: estree.Expression): boolean {
      switch (expr.type) {
        case 'Literal':
          return typeof expr.value === 'string';
        case 'TemplateLiteral':
          return expr.expressions.length === 0;
        case 'Identifier':
          return hardcodedVariables.has(expr.name);
        default:
          return false;
      }
    }

    function getReportNode(expr: estree.Expression): estree.Node {
      // If it's an identifier that references a hardcoded string, report the original declaration
      if (expr.type === 'Identifier' && hardcodedVariables.has(expr.name)) {
        const nodeName = hardcodedVariables.get(expr.name);
        if (nodeName) {
          return nodeName;
      }
      return expr;
    }

    function isMnemonicFunction(callee: estree.Expression | estree.Super): boolean {
      return MNEMONIC_FUNCTIONS.some(func => isMemberWithProperty(callee, func));
    }

    return {
      Program() {
        isBlockchainModuleImported = false;
        hardcodedVariables.clear();
      },

      ImportDeclaration(node: estree.ImportDeclaration) {
        if (BLOCKCHAIN_MODULES.includes(node.source.value as estree.Literal)) {
          isBlockchainModuleImported = true;
        }
      },

      VariableDeclarator(node: estree.VariableDeclarator) {
        if (
          node.id.type === 'Identifier' &&
          node.init &&
          ((node.init.type === 'Literal' && typeof node.init.value === 'string') ||
            (node.init.type === 'TemplateLiteral' && node.init.expressions.length === 0))
        ) {
          hardcodedVariables.set(node.id.name, node.init);
        }
      },

      CallExpression(node: estree.CallExpression) {
        if (isRequireModule(node, ...BLOCKCHAIN_MODULES)) {
          isBlockchainModuleImported = true;
          return;
        }

        if (
          isBlockchainModuleImported &&
          isMnemonicFunction(node.callee) &&
          node.arguments.length > 0 &&
          node.arguments[0].type !== 'SpreadElement' &&
          isHardcodedString(node.arguments[0])
        ) {
          context.report({
            messageId: 'reviewBlockchainSeedPhrase',
            node: getReportNode(node.arguments[0]),
          });
        }
      },
    };
  },
};
