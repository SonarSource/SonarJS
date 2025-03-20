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
// https://sonarsource.github.io/rspec/#/rspec/S5691/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getUniqueWriteUsage,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const SERVE_STATIC = 'serve-static';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      safeHiddenFile: 'Make sure serving hidden files is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        // serveStatic(...)
        const { callee, arguments: args } = node as estree.CallExpression;
        if (getFullyQualifiedName(context, callee) === SERVE_STATIC && args.length > 1) {
          let options: estree.Node | undefined = args[1];
          if (options.type === 'Identifier') {
            options = getUniqueWriteUsage(context, options.name, node);
          }

          const dotfilesProperty = getProperty(options, 'dotfiles', context);
          if (
            dotfilesProperty?.value.type === 'Literal' &&
            dotfilesProperty.value.value === 'allow'
          ) {
            context.report({ node: dotfilesProperty, messageId: 'safeHiddenFile' });
          }
        }
      },
    };
  },
};
