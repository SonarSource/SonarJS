/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-5691

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfIdentifier,
  getUniqueWriteUsage,
  getObjectExpressionProperty,
} from '../utils';

const SERVE_STATIC = 'serve-static';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      safeHiddenFile: 'Make sure serving hidden files is safe here.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const { callee, arguments: args } = node as estree.CallExpression;
        if (callee.type !== 'Identifier') {
          return;
        }

        // serveStatic(...)
        const module = getModuleNameOfIdentifier(context, callee);
        if (module?.value === SERVE_STATIC && args.length > 1) {
          let options: estree.Node | undefined = args[1];
          if (options.type === 'Identifier') {
            options = getUniqueWriteUsage(context, options.name);
          }

          const dotfilesProperty = getObjectExpressionProperty(options, 'dotfiles');
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
