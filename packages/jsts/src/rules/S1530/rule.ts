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
// https://sonarsource.github.io/rspec/#/rspec/S1530/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getMainFunctionTokenLocation,
  getParent,
  RuleContext,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      blockedFunction: 'Do not use function declarations within blocks.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      ':not(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression) > BlockStatement > FunctionDeclaration':
        (node: estree.Node) => {
          context.report({
            messageId: 'blockedFunction',
            loc: getMainFunctionTokenLocation(
              node as TSESTree.FunctionDeclaration,
              getParent(context, node) as TSESTree.Node,
              context as unknown as RuleContext,
            ),
          });
        },
    };
  },
};
