/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
export const implementation = 'external';
export const eslintId = 'no-global-regexp-flag-in-query';
export const externalPlugin = 'testing-library';
export const requiredDependency = [
  '@testing-library/dom',
  '@testing-library/react',
  '@testing-library/vue',
  '@testing-library/angular',
  '@testing-library/svelte',
  'storybook',
] as const;
export const quickFixMessage = "Remove the 'g' flag";
