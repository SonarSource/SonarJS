/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-3798
import { Rule } from 'eslint';
import * as estree from 'estree';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      Program() {
        const scope = context.getScope();
        // As we parse every file with "module" source type, we find user defined global variables in the module scope
        const moduleScope = findModuleScope(context);
        moduleScope?.variables.forEach(variable => {
          if (scope.variables.find(global => global.name === variable.name)) {
            // Avoid reporting on redefinitions of actual global variables
            return;
          }
          for (const def of variable.defs) {
            const defNode = def.node;
            if (
              def.type === 'FunctionName' ||
              (def.type === 'Variable' && def.parent?.kind === 'var' && !isRequire(def.node.init))
            ) {
              context.report({
                node: defNode,
                message:
                  'Define this declaration in a local scope or bind explicitly the property to the global object.',
              });
              return;
            }
          }
        });
      },
    };
  },
};

function findModuleScope(context: Rule.RuleContext) {
  return context.getSourceCode().scopeManager.scopes.find(s => s.type === 'module');
}

function isRequire(node: estree.Node | null | undefined) {
  return (
    node?.type === 'CallExpression' &&
    node.arguments.length === 1 &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require'
  );
}
