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
import { getRuleSchema } from './helpers';

/**
 * An internal rule parameter for secondary location support
 *
 * ESLint API for reporting messages does not provide a mechanism to
 * include more than locations and fixes in the generated report. It
 * prevents us from having a proper support for secondary locations.
 *
 * As a workaround, internal rules (or even decorated ones) that want
 * to use secondary locations first need to include in their schema a
 * `sonar-runtime` parameter as follows:
 *
 * ```
 *  meta: {
 *    schema: [{
 *      enum: [SONAR_RUNTIME]
 *    }]
 *  }
 * ```
 *
 * Rules then need to encode secondary locations in the report descriptor
 * with the `toEncodedMessage` helper. This helper function encodes such
 * locations through stringified JSON objects in the `message` property
 * of the descriptor.
 *
 * The linter wrapper eventually decodes issues with secondary locations
 * by checking the presence of the internal parameter in the rule schema
 * while transforming an ESLint message into a SonarQube issue.
 */
export const SONAR_RUNTIME = 'sonar-runtime';

/**
 * Checks if the rule schema sets the `sonar-runtime` internal parameter
 * @param ruleModule the rule definition
 * @returns true if the rule definition includes the parameter
 */
export function hasSonarRuntimeOption(ruleModule: Rule.RuleModule | undefined): boolean {
  const schema = getRuleSchema(ruleModule);

  if (Array.isArray(schema)) {
    return schema.some(option => !!option.enum && option.enum.includes(SONAR_RUNTIME));
  }
  if (schema?.type === 'array' && Array.isArray(schema.items)) {
    return schema.items.some(
      option => option.type === 'string' && option.enum?.includes(SONAR_RUNTIME),
    );
  }
  return false;
}
