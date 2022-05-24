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
// https://sonarsource.github.io/rspec/#/rspec/S4036/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getModuleNameOfNode, isMethodCall, isIdentifier } from '../utils';

const SENSITIVE_METHODS = ['exec', 'execSync', 'spawn', 'spawnSync', 'execFile', 'execFileSync'];

export const rule: Rule.RuleModule = {
  meta: {},
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.CallExpression) => {
        if (isMethodCall(node)) {
          const { property, object } = node.callee;
          if (isIdentifier(property, ...SENSITIVE_METHODS) &&
            SENSITIVE_METHODS.includes(property.name) &&
            object.type === 'Identifier' &&
            getModuleNameOfNode(context, object)?.value === 'child_process'
          ) {
            context.report({
              message: 'Searching OS commands in PATH is security-sensitive',
              node: property,
            });
          }
        }
      },
    };
  },
};
