/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6627/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isRequire, isStringLiteral } from '../helpers/index.js';
import { meta } from './meta.js';

const messages = {
  default: 'Do not use internal APIs of your dependencies',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { messages }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.CallExpression) {
        if (isRequire(node)) {
          const [arg] = node.arguments;
          if (isStringLiteral(arg) && arg.value.includes('node_modules')) {
            context.report({
              node,
              messageId: 'default',
            });
          }
        }
      },
      ImportDeclaration(node: estree.ImportDeclaration) {
        const moduleName = node.source.value as string;
        if (moduleName.includes('node_modules')) {
          context.report({
            node,
            messageId: 'default',
          });
        }
      },
    };
  },
};
