/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { getFullyQualifiedName, getVariableFromName } from '../helpers';
import * as estree from 'estree';

type Reference = {
  setter: Scope.Variable | undefined;
  value: Scope.Variable | undefined;
};

const declarationSelector = [
  ':matches(',
  [
    'VariableDeclarator[init.callee.name="useState"]',
    'VariableDeclarator[init.callee.object.type="Identifier"][init.callee.property.name="useState"]',
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

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      uselessSetState: 'Change the argument of this setter to not use its matching state variable',
    },
  },
  create(context: Rule.RuleContext) {
    const referencesBySetterName: { [key: string]: Reference } = {};

    return {
      [declarationSelector](node: estree.VariableDeclarator) {
        if (isReactCall(context, node.init as estree.CallExpression)) {
          const { elements } = node.id as estree.ArrayPattern;
          const setter = (elements[1] as estree.Identifier).name;
          referencesBySetterName[setter] = {
            setter: getVariableFromName(context, setter),
            value: getVariableFromName(context, (elements[0] as estree.Identifier).name),
          };
        }
      },
      [callSelector](node: estree.CallExpression) {
        const setter = getVariableFromName(context, (node.callee as estree.Identifier).name);
        const value = getVariableFromName(context, (node.arguments[0] as estree.Identifier).name);
        const key = setter?.name as string;
        if (
          setter &&
          value &&
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
  const fqn = getFullyQualifiedName(context, callExpr);
  if (fqn) {
    const [module] = fqn.split('.');
    return module === 'react';
  }
  return false;
}
