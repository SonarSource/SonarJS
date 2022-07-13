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
// https://sonarsource.github.io/rspec/#/rspec/S6443/javascript

import { Rule, Scope } from 'eslint';
import {
  getModuleNameOfIdentifier,
  getModuleNameOfImportedIdentifier,
  isRequiredParserServices,
} from '../utils';
import * as estree from 'estree';

type reference = {
  setter: Scope.Variable | null;
  value: Scope.Variable | null;
};

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      uselessSetState: 'Change the parameter of this setter to not use its matching state variable',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    const stateVariables: { [key: string]: reference } = {};

    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      'VariableDeclarator[id.type="ArrayPattern"][id.elements.length=2][id.elements.0.type="Identifier"][id.elements.1.type="Identifier"]'(
        node: estree.VariableDeclarator,
      ) {
        const ids = node.id as estree.ArrayPattern;
        const setter = (ids.elements[1] as estree.Identifier).name;
        stateVariables[setter] = {
          setter: null,
          value: null,
        };

        let module: estree.Literal | undefined;
        let usesReactState = false;
        if (node.init!.type === 'CallExpression') {
          if (node.init.callee.type === 'Identifier') {
            module = getModuleNameOfImportedIdentifier(context, node.init.callee);
            usesReactState = module?.value === 'react' && node.init.callee.name === 'useState';
          }
          if (
            node.init.callee.type === 'MemberExpression' &&
            (node.init.callee.property as estree.Identifier).name === 'useState'
          ) {
            module = getModuleNameOfIdentifier(
              context,
              node.init.callee.object as estree.Identifier,
            );
            usesReactState = module?.value === 'react';
          }
        }

        if (usesReactState) {
          const scope = context.getScope();
          scope.references.forEach(ref => {
            if (ref.identifier === ids.elements[0] && ref.resolved) {
              stateVariables[setter].value = ref.resolved;
            }
            if (ref.identifier === ids.elements[1] && ref.resolved) {
              stateVariables[setter].setter = ref.resolved;
            }
          });
        }
      },
      'CallExpression[arguments.length=1][arguments.0.type="Identifier"]'(
        node: estree.CallExpression,
      ) {
        const { scopeManager } = context.getSourceCode();
        let match: reference = {
          setter: null,
          value: null,
        };
        for (const scope of scopeManager.scopes) {
          scope.references.forEach(ref => {
            if (ref.identifier === node.callee && ref.resolved) {
              match.setter = ref.resolved;
            }
            if (ref.identifier === node.arguments[0] && ref.resolved) {
              match.value = ref.resolved;
            }
          });
        }
        const key = match.setter?.name as string;
        if (stateVariables.hasOwnProperty(key)) {
          if (
            stateVariables[key].setter === match.setter &&
            stateVariables[key].value === match.value
          ) {
            context.report({
              messageId: 'uselessSetState',
              node: node,
            });
          }
        }
      },
    };
  },
};
