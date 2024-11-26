/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { Rule } from 'eslint';
import pkg from '@typescript-eslint/eslint-plugin';
const { rules } = pkg;
import { sanitize } from './sanitize.js';

/**
 * TypeScript ESLint rules that rely on type information fail at runtime because
 * they unconditionally assume that TypeScript's type checker is available.
 */
const sanitized: Record<string, Rule.RuleModule> = {};
for (const ruleKey of Object.keys(rules)) {
  sanitized[ruleKey] = sanitize(rules[ruleKey] as unknown as Rule.RuleModule);
}

/**
 * TypeScript ESLint rules.
 */
export const tsEslintRules = sanitized;
