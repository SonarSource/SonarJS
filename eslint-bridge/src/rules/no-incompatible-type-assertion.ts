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
// https://sonarsource.github.io/rspec/#/rspec/S5845/javascript

import { Rule } from 'eslint';
import {
  Chai,
  getTypeAsString,
  haveDissimilarTypes,
  isIdentifier,
  isRequiredParserServices,
  RequiredParserServices,
  toEncodedMessage,
} from '../utils';
import * as estree from 'estree';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;

    if (!isRequiredParserServices(services) || !Chai.isImported(context)) {
      return {};
    }

    return {
      CallExpression: (node: estree.Node) => {
        const { callee, arguments: args } = node as estree.CallExpression;
        if (callee.type === 'MemberExpression') {
          checkAssert(context, services, callee, args);
        }
      },
    };
  },
};

function checkAssert(
  context: Rule.RuleContext,
  services: RequiredParserServices,
  callee: estree.MemberExpression,
  args: estree.Node[],
) {
  const [arg1, arg2] = args;
  if (!arg2) {
    return;
  }

  const { object, property } = callee;
  if (!isIdentifier(object, 'assert')) {
    return;
  }

  if (isIdentifier(property, 'equal', 'notEqual')) {
    // non-strict equality
    const arg1Type = getTypeAsString(arg1, services);
    const arg2Type = getTypeAsString(arg2, services);
    if (haveDissimilarTypes(arg1, arg2, services)) {
      context.report({
        node: arg1,
        message: toEncodedMessage(
          `Change this assertion to not compare dissimilar types ("${arg1Type}" and "${arg2Type}").`,
          [],
        ),
      });
    }
  }

  if (isIdentifier(property, 'strictEqual', 'notStrictEqual')) {
    // strict equality
  }
}
