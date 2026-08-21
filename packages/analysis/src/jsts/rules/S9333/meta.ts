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
// https://sonarsource.github.io/rspec/#/rspec/S9333/javascript
export const implementation = 'decorated';
export const eslintId = 'no-await-sync-queries';
export const externalRules = [
  { externalPlugin: 'testing-library', externalRule: 'no-await-sync-queries' },
];
export const requiredDependency = [
  '@testing-library/dom',
  '@testing-library/react',
  '@testing-library/vue',
  '@testing-library/angular',
  '@testing-library/svelte',
  'storybook',
] as const;
export const quickFixMessage = 'Remove the unnecessary await';
