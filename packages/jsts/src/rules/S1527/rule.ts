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
// https://sonarsource.github.io/rspec/#/rspec/S1527/javascript

import { Rule, Scope } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

const futureReservedWords = [
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
  'enum',
  'class',
  'const',
  'export',
  'extends',
  'import',
  'super',
  'let',
  'static',
  'yield',
  'await',
];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      renameReserved:
        'Rename "{{reserved}}" identifier to prevent potential conflicts with future evolutions of the JavaScript language.',
    },
  }),
  create(context: Rule.RuleContext) {
    function checkVariable(variable: Scope.Variable) {
      if (variable.defs.length > 0) {
        const def = variable.defs[0].name;
        context.report({
          node: def,
          messageId: 'renameReserved',
          data: {
            reserved: variable.name,
          },
        });
      }
    }

    function checkVariablesByScope(scope: Scope.Scope) {
      scope.variables.filter(v => futureReservedWords.includes(v.name)).forEach(checkVariable);

      scope.childScopes.forEach(childScope => {
        checkVariablesByScope(childScope);
      });
    }

    return {
      'Program:exit': (node: estree.Node) => {
        checkVariablesByScope(context.sourceCode.getScope(node));
      },
    };
  },
};
