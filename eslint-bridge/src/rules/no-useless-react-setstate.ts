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

import { Rule } from 'eslint';
import { isRequiredParserServices } from '../utils';
import * as estree from 'estree';

type reference = {
  setter: estree.Identifier,
  value: estree.Identifier
}

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      uselessSetState: 'Change the parameter of this setter to not use its matching state variable'
    },
  },  
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    const stateVariables: {[key: string]: reference} = {};

    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      'VariableDeclarator[init.callee.name="useState"] > ArrayPattern[elements.length=2]'(node: estree.ArrayPattern) {
        //console.log(node)
        if (node.elements.every(elem => elem?.type === "Identifier")) {
          stateVariables[(node.elements[1] as estree.Identifier).name] = {
            value: (node.elements[0] as estree.Identifier),
            setter: (node.elements[1] as estree.Identifier)
          };
        }
      },
      'CallExpression[arguments.length=1]'(node:estree.CallExpression) {
        //console.log(node)
        const scope = context.getScope();
        const symbol = scope.references.find(v => v.identifier === node.callee)?.resolved;
        if (!symbol) {
          return;
        }
        console.log(symbol);

      }
    };
  },
};
