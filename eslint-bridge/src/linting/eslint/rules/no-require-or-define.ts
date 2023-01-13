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
// https://sonarsource.github.io/rspec/#/rspec/S3533/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isRequiredParserServices, RequiredParserServices, isFunction, isString } from './helpers';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      standardImport: 'Use a standard "import" statement instead of "{{adhocImport}}".',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      'CallExpression[callee.type="Identifier"]': (node: estree.Node) => {
        if (context.getScope().type !== 'module' && context.getScope().type !== 'global') {
          return;
        }
        const callExpression = node as estree.CallExpression;
        const identifier = callExpression.callee as estree.Identifier;
        if (
          isAmdImport(callExpression, identifier, services) ||
          isCommonJsImport(callExpression, identifier, services)
        ) {
          context.report({
            node: identifier,
            messageId: 'standardImport',
            data: {
              adhocImport: identifier.name,
            },
          });
        }
      },
    };
  },
};

function isCommonJsImport(
  callExpression: estree.CallExpression,
  identifier: estree.Identifier,
  services: RequiredParserServices,
): boolean {
  return (
    callExpression.arguments.length === 1 &&
    isString(callExpression.arguments[0], services) &&
    identifier.name === 'require'
  );
}

function isAmdImport(
  callExpression: estree.CallExpression,
  identifier: estree.Identifier,
  services: RequiredParserServices,
): boolean {
  if (identifier.name !== 'require' && identifier.name !== 'define') {
    return false;
  }
  if (callExpression.arguments.length !== 2 && callExpression.arguments.length !== 3) {
    return false;
  }
  return isFunction(callExpression.arguments[callExpression.arguments.length - 1], services);
}
