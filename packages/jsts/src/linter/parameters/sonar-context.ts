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
import { Rule } from 'eslint';
import { getRuleSchema } from './helpers/schema.ts';

/**
 * An internal rule parameter for context-passing support
 *
 * Rules implemented in the bridge all have access to the global
 * context since they share the same code base. However, external
 * rules like custom rules don't benefit from the same visibilty.
 *
 * To remedy this, rules that need to access the global context
 * for whatever reason can do so by first setting this parameter:
 *
 *
 * ```
 *  meta: {
 *    schema: [{
 *      title: 'sonar-context',
 *    }]
 *  }
 * ```
 *
 * The global context object can then be retrieved from the options
 * of ESLint's rule context, that is, `context.options`.
 */
export const SONAR_CONTEXT = 'sonar-context';

/**
 * Checks if the rule schema sets the `sonar-context` internal parameter
 * @param ruleModule the rule definition
 * @param ruleId the ESLint rule key
 * @returns true if the rule definition includes the parameter
 */
export function hasSonarContextOption(
  ruleModule: Rule.RuleModule | undefined,
  ruleId: string,
): boolean {
  const schema = getRuleSchema(ruleModule, ruleId);

  if (Array.isArray(schema)) {
    return schema.some(option => option.title === SONAR_CONTEXT);
  }
  if (schema?.type === 'array' && Array.isArray(schema.items)) {
    return schema.items.some(option => option.title === SONAR_CONTEXT);
  }
  return false;
}
