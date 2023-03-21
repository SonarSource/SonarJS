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
import * as estree from 'estree';
import { Rule } from 'eslint';
import { getVariableFromIdentifier } from '../reaching-definitions';
import { getUniqueWriteReference, isStringLiteral } from '../ast';

export function getFlags(
  callExpr: estree.CallExpression,
  context?: Rule.RuleContext,
): string | null {
  if (callExpr.arguments.length < 2) {
    return '';
  }

  const flags = callExpr.arguments[1];
  if (flags.type === 'Literal' && typeof flags.value === 'string') {
    return flags.value;
  } else if (flags.type === 'Identifier' && context !== undefined) {
    // it's a variable, so we try to extract its value, but only if it's written once (const)
    const variable = getVariableFromIdentifier(flags, context.getScope());
    const ref = getUniqueWriteReference(variable);
    if (ref !== undefined && isStringLiteral(ref)) {
      return ref.value;
    }
  }
  return null;
}
