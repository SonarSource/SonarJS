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
// https://sonarsource.github.io/rspec/#/rspec/S6627/javascript

import { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isIdentifier } from '../helpers';
import { meta } from './meta'; // run "npx ts-node tools/generate-meta.ts" to generate meta.json files

const messages = {
  //TODO: add needed messages
  require: 'message body',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { messages }),
  create(context: Rule.RuleContext) {
    return {
      //example
      CallExpression(node: estree.CallExpression) {
        if (isIdentifier(node.callee, 'require') && node.arguments.length === 1) {
          const [arg] = node.arguments;
          if (
            arg.type === 'Literal' &&
            typeof arg.value === 'string' &&
            arg.value.includes('node_modules')
          ) {
            context.report({
              node,
              messageId: 'require',
            });
          }
        }
      },
    };
  },
};
