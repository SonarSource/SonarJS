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
import { Rule } from 'eslint';
import * as estree from 'estree';
import { getValueOfExpression, getPropertyWithValue } from './node-extractors';
import { toEncodedMessage } from './secondary-locations';

export function checkSensitiveCall(
  context: Rule.RuleContext,
  callExpression: estree.CallExpression,
  sensitiveArgumentIndex: number,
  sensitiveProperty: string,
  sensitivePropertyValue: boolean,
  message: string,
) {
  if (callExpression.arguments.length < sensitiveArgumentIndex + 1) {
    return;
  }
  const sensitiveArgument = callExpression.arguments[sensitiveArgumentIndex];
  const options = getValueOfExpression(context, sensitiveArgument, 'ObjectExpression');
  if (!options) {
    return;
  }
  const unsafeProperty = getPropertyWithValue(
    context,
    options,
    sensitiveProperty,
    sensitivePropertyValue,
  );
  if (unsafeProperty) {
    context.report({
      node: callExpression.callee,
      message: toEncodedMessage(message, [unsafeProperty]),
    });
  }
}
