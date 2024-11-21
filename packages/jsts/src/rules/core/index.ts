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
import { Linter } from 'eslint';

/**
 * ESLint core rules.
 *
 * TODO: check typescript-eslint to import core rules:
 * https://github.com/typescript-eslint/typescript-eslint/blob/75df60587d045438df448d76cc0ee093c8c31e28/packages/eslint-plugin/src/util/getESLintCoreRule.ts
 */
export const eslintRules = Object.fromEntries(new Linter({ configType: 'eslintrc' }).getRules());
