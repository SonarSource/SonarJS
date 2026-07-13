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
// https://sonarsource.github.io/rspec/#/rspec/S6842/javascript

import type { ESLintConfiguration } from '../helpers/configs.js';

// Interactive roles that the ARIA in HTML conformance table
// (https://w3c.github.io/html-aria/#docconformance) permits per element.
// "Any role" elements, the context-sensitive elements (li, img, figure, label)
// and the list-container `toolbar` structure role are handled in decorator.ts.
const LIST_CONTAINER_ROLES = ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree'];

const allowlist: Record<string, string[]> = {
  ul: LIST_CONTAINER_ROLES,
  ol: LIST_CONTAINER_ROLES,
  menu: LIST_CONTAINER_ROLES,
  nav: ['menu', 'menubar', 'tablist'],
  h1: ['tab'],
  h2: ['tab'],
  h3: ['tab'],
  h4: ['tab'],
  h5: ['tab'],
  h6: ['tab'],
  fieldset: ['radiogroup', 'presentation'],
  td: ['gridcell'],
  progress: ['progressbar'],
  // Restricted to `listitem` only when the parent still exposes a list role;
  // decorator.ts allows any role otherwise.
  li: [],
};

export const fields: ESLintConfiguration = [
  Object.entries(allowlist).map(([field, defaultValue]) => ({
    field,
    default: defaultValue,
  })),
];
