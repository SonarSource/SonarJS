/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6582/javascript

import { Rule } from 'eslint';
import { tsEslintRules } from '../typescript-eslint';

/**
 * Original rule 'prefer-optional-chain' from TypeScript ESLint.
 */
const preferOptionalChainRule = tsEslintRules['prefer-optional-chain'];

/**
 * Sanitized rule 'prefer-optional-chain' from TypeScript ESLint.
 *
 * TypeScript ESLint's rule raises a runtime error if the parser services of the
 * injected context is missing some helper functions allowing to convert between
 * TypeScript ESLint and TypeScript ASTs. Contrary to rules requiring type checking,
 * there is no way to determine programmatically if a rule requires such a service.
 *
 * This is the case for the rule 'prefer-optional-chain', for which we need to provide
 * a custom sanitization in case the parser services miss these helpers.
 *
 * @see https://github.com/typescript-eslint/typescript-eslint/blob/cf045f2c390353c1a074ba85391f773f1ede702c/packages/eslint-plugin/src/rules/prefer-optional-chain.ts#LL54C39-L54C39
 * @see https://github.com/typescript-eslint/typescript-eslint/blob/cf045f2c390353c1a074ba85391f773f1ede702c/packages/utils/src/eslint-utils/getParserServices.ts#L19-L25
 */
export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    fixable: 'code',
    messages: { ...preferOptionalChainRule.meta!.messages },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!services?.program || !services.esTreeNodeToTSNodeMap || !services.tsNodeToESTreeNodeMap) {
      return {};
    }
    return preferOptionalChainRule.create(context);
  },
};
