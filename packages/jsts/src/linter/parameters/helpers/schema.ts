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

/**
 * Extracts the schema of a rule
 * @param ruleModule the rule definition
 * @param ruleId the rule id
 * @returns the extracted rule schema, if any
 */
export function getRuleSchema(ruleModule: Rule.RuleModule | undefined, ruleId: string) {
  ruleId;
  if (!ruleModule) {
    return undefined;
  }
  if (!ruleModule.meta?.schema) {
    return undefined;
  }
  const { schema } = ruleModule.meta;
  return Array.isArray(schema) ? schema : [schema];
}
