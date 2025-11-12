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

const blockChainModules = [ "ethers", "viem/accounts", "tronweb" ];
const mnemonicTakingFunctions = [ "fromPhrase", "mnemonicToAccount", "fromMnemonic" ];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      reviewBlockchainSeedPhrase: `Revoke and change this seed phrase, as it is compromised.`,
    },
  }),
  create(context: Rule.RuleContext) {
    let isBcModuleImported = false;

    return {
      Program() {
        isBcModuleImported = false;
      },

      ImportDeclaration(node: estree.Node) {
        const { source } = node as estree.ImportDeclaration;
        if (blockChainModules.includes(String(source.value))) {
          isBcModuleImported = true;
        }
      },

      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee, arguments: args } = call;

        if (isRequireModule(call, ...dbModules)) {
          isBcModuleImported = true;
          return;
        }

        const isUnsafeFunction = mnemonicTakingFunctions.some(func =>
          isMemberWithProperty(callee, func)
        );

        const isHardcodedString = (arg: estree.Expression) => {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            return true;
          }
          if (arg.type === 'TemplateLiteral') {
            return arg.expressions.length === 0;
          }
          if (arg.type === 'BinaryExpression' && arg.operator === '+') {
            return isHardcodedString(arg.left) && isHardcodedString(arg.right);
          }
          return false;
        }

        if (
          isBcModuleImported &&
          isUnsafeFunction &&
          args.length > 0 &&
          isHardcodedString(args[0])
        ) {
          context.report({
            messageId: 'reviewBlockchainSeedPhrase',
            node: callee,
          });
        }
      },
    };
  },
};
