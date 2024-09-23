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
// https://sonarsource.github.io/rspec/#/rspec/S5757/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getValueOfExpression,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

const MESSAGE = 'Make sure confidential information is not logged here.';
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    return {
      NewExpression: (node: estree.Node) => {
        const newExpression = node as estree.NewExpression;
        const { callee } = newExpression;
        if (getFullyQualifiedName(context, callee) !== 'signale.Signale') {
          return;
        }
        if (newExpression.arguments.length === 0) {
          report(context, { node: callee, message: MESSAGE });
          return;
        }
        const firstArgument = getValueOfExpression(
          context,
          newExpression.arguments[0],
          'ObjectExpression',
        );
        if (!firstArgument) {
          // Argument exists but its value is unknown
          return;
        }
        const secrets = getProperty(firstArgument, 'secrets', context);
        if (
          secrets &&
          secrets.value.type === 'ArrayExpression' &&
          secrets.value.elements.length === 0
        ) {
          report(
            context,
            {
              node: callee,
              message: MESSAGE,
            },
            [toSecondaryLocation(secrets)],
          );
        } else if (!secrets) {
          report(
            context,
            {
              node: callee,
              message: MESSAGE,
            },
            [toSecondaryLocation(firstArgument)],
          );
        }
      },
    };
  },
};
