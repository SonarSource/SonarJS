/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-2424

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';

const BUILT_IN_OBJECTS = [
  'Object',
  'Function',
  'Boolean',
  'Symbol',
  'Error',
  'EvalError',
  'InternalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'Number',
  'Math',
  'Date',
  'String',
  'RegExp',
  'Array',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Unit16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'ArrayBuffer',
  'DataView',
  'JSON',
  'Promise',
  'Reflect',
  'Proxy',
  'Intl',
  'Generator',
  'Iterator',
  'ParallelArray',
  'StopIteration',
];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const overriden: Set<estree.Identifier> = new Set();

    function isBuiltIn(variable: Scope.Variable) {
      return BUILT_IN_OBJECTS.includes(variable.name);
    }

    function checkVariable(variable: Scope.Variable) {
      if (isBuiltIn(variable)) {
        variable.defs.forEach(def => overriden.add(def.name));
        variable.references
          .filter(ref => ref.isWrite())
          .forEach(ref => overriden.add(ref.identifier));
      }
    }

    return {
      '*': (node: estree.Node) => {
        const variables = [];
        variables.push(...context.getDeclaredVariables(node));
        variables.push(...context.getScope().variables);
        variables.forEach(checkVariable);
      },
      'Program:exit': () => {
        overriden.forEach(node =>
          context.report({
            message: `Remove this override of "${node.name}".`,
            node,
          }),
        );
      },
    };
  },
};
