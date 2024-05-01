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
import { rules as sonarjsESLintRules } from 'eslint-plugin-sonarjs';
import { CustomRule } from './custom-rule';
import { Rule } from 'eslint';

/**
 * The internal _cognitive complexity_ custom rule
 *
 * The rule computes file-level cognitive complexity.
 */
export const rule: CustomRule = {
  ruleId: 'internal-cognitive-complexity',
  ruleModule: sonarjsESLintRules['cognitive-complexity'] as unknown as Rule.RuleModule,
  ruleConfig: ['metric'],
};
