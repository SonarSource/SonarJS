/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { getESLintCoreRule } from '../external/core.js';
import { decorate } from './decorator.js';

/**
 * TypeScript ESLint implementation of 'no-throw-literal' does not support JavaScript code.
 * Therefore, we decorate ESLint's implementation of the rule.
 */
export const rule = decorate(getESLintCoreRule('no-throw-literal'));
