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
import * as estree from 'estree';
import { Rule } from 'eslint';
import { getVariableFromIdentifier } from '../reaching-definitions';
import {
  getUniqueWriteReference,
  getSimpleRawStringValue,
  isSimpleRawString,
  isStaticTemplateLiteral,
  isStringLiteral,
} from '../ast';

export function getFlags(
  callExpr: estree.CallExpression,
  context?: Rule.RuleContext,
): string | null {
  if (callExpr.arguments.length < 2) {
    return '';
  }

  const flags = callExpr.arguments[1];
  // Matches flags in: new RegExp(pattern, 'u')
  if (isStringLiteral(flags)) {
    return flags.value;
  }
  if (flags.type === 'Identifier' && context !== undefined) {
    // it's a variable, so we try to extract its value, but only if it's written once (const)
    const variable = getVariableFromIdentifier(flags, context.getScope());
    const ref = getUniqueWriteReference(variable);
    if (ref !== undefined && isStringLiteral(ref)) {
      return ref.value;
    }
  }
  // Matches flags with basic template literals as in: new RegExp(pattern, `u`)
  // but not: new RegExp(pattern, `${flag}`)
  // The cooked value should always be non-null in this case.
  if (isStaticTemplateLiteral(flags) && flags.quasis[0].value.cooked != null) {
    return flags.quasis[0].value.cooked;
  }
  // Matches flags with simple raw strings as in: new RegExp(pattern, String.raw`u`)
  // but not: new RegExp(pattern, String.raw`${flag}`)
  if (isSimpleRawString(flags)) {
    return getSimpleRawStringValue(flags);
  }
  return null;
}
