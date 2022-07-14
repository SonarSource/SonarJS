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
  getVariableFromName,
} from '../utils';
import * as estree from 'estree';

type Reference = {
  setter: Scope.Variable | null;
  value: Scope.Variable | null;
};

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      uselessSetState: 'Change the argument of this setter to not use its matching state variable',
    },
  },
  create(context: Rule.RuleContext) {
    const referencesBySetterName: { [key: string]: Reference } = {};

    const declaratorSelector = [
      ':matches(',
      [
        'VariableDeclarator[init.callee.name="useState"]',
        'VariableDeclarator[init.callee.property.name="useState"]',
      ].join(','),
      ')',
      '[id.type="ArrayPattern"]',
      '[id.elements.length=2]',
      '[id.elements.0.type="Identifier"]',
      '[id.elements.1.type="Identifier"]',
    ].join('');

    const callSelector = [
      'CallExpression[callee.type="Identifier"]',
      '[arguments.length=1]',
      '[arguments.0.type="Identifier"]',
    ].join('');

    return {
      [declaratorSelector](node: estree.VariableDeclarator) {
        if (isReactCall(context, node.init as estree.CallExpression)) {
          const ids = node.id as estree.ArrayPattern;
          const setter = (ids.elements[1] as estree.Identifier).name;
          referencesBySetterName[setter] = {
            setter: null,
            value: null,
          };
          const scope = context.getScope();
          scope.references.forEach(ref => {
            if (ref.identifier === ids.elements[0] && ref.resolved) {
              referencesBySetterName[setter].value = ref.resolved;
            }
            if (ref.identifier === ids.elements[1] && ref.resolved) {
              referencesBySetterName[setter].setter = ref.resolved;
            }
          });
        }
      },
      [callSelector](node: estree.CallExpression) {
        const setter = getVariableFromName(context, (node.callee as estree.Identifier).name);
        const value = getVariableFromName(context, (node.arguments[0] as estree.Identifier).name);
        const key = setter?.name as string;
        if (
          referencesBySetterName.hasOwnProperty(key) &&
          referencesBySetterName[key].setter === setter &&
          referencesBySetterName[key].value === value
        ) {
          context.report({
            messageId: 'uselessSetState',
            node,
          });
        }
      },
    };
  },
};

function isReactCall(context: Rule.RuleContext, callExpr: estree.CallExpression): boolean {
  let usesReactState = false;

  if (callExpr.callee.type === 'Identifier') {
    const module = getModuleNameOfImportedIdentifier(context, callExpr.callee);
    usesReactState = module?.value === 'react';
  } else if (callExpr.callee.type === 'MemberExpression') {
    const module = getModuleNameOfIdentifier(context, callExpr.callee.object as estree.Identifier);
    usesReactState = module?.value === 'react';
  }
  return usesReactState;
}
