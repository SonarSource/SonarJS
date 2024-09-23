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
// https://sonarsource.github.io/rspec/#/rspec/S5691/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getUniqueWriteUsage,
} from '../helpers/index.js';
import { meta } from './meta.js';

const SERVE_STATIC = 'serve-static';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
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
