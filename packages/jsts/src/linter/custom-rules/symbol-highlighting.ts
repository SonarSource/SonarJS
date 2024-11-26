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
import { CustomRule } from './custom-rule.js';
import { rule as symbolHighlightingRule } from '../visitors/symbol-highlighting.js';
import type { Rule } from 'eslint';

/**
 * The internal _symbol highlighting_ custom rule
 */
export const rule: CustomRule = {
  ruleId: 'internal-symbol-highlighting',
  ruleModule: symbolHighlightingRule as unknown as Rule.RuleModule,
  ruleConfig: [],
};
