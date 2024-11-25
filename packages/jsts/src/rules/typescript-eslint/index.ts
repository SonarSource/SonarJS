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
import type { Rule } from 'eslint';
import pkg from '@typescript-eslint/eslint-plugin';
const { rules: tsEslintRules } = pkg;
import { sanitize } from './sanitize.js';

/**
 * TypeScript ESLint rules that rely on type information fail at runtime because
 * they unconditionally assume that TypeScript's type checker is available.
 */
const sanitized: Record<string, Rule.RuleModule> = {};
for (const ruleKey of Object.keys(tsEslintRules)) {
  sanitized[ruleKey] = sanitize(tsEslintRules[ruleKey] as unknown as Rule.RuleModule);
}

/**
 * TypeScript ESLint rules.
 */
export const rules = sanitized;
