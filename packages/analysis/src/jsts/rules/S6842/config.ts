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
import { getUpstreamRecommendedConfiguration } from '../external/a11y.js';

type Allowlist = Record<string, string[]>;

const LIST_CONTAINER_COMPOSITE_ROLES = [
  'listbox',
  'menu',
  'menubar',
  'radiogroup',
  'tablist',
  'toolbar',
  'tree',
];

const TABLE_COMPOSITE_ROLES = [...LIST_CONTAINER_COMPOSITE_ROLES, 'grid', 'treegrid'];

const upstreamAllowlist = getUpstreamRecommendedConfiguration(
  'no-noninteractive-element-to-interactive-role',
) as Allowlist;

const allowlist: Allowlist = {
  ...upstreamAllowlist,
  ul: [...new Set([...upstreamAllowlist.ul, 'toolbar'])],
  ol: [...new Set([...upstreamAllowlist.ol, 'toolbar'])],
  table: [...new Set([...upstreamAllowlist.table, ...TABLE_COMPOSITE_ROLES])],
  menu: LIST_CONTAINER_COMPOSITE_ROLES,
  tbody: TABLE_COMPOSITE_ROLES,
  thead: TABLE_COMPOSITE_ROLES,
  tfoot: TABLE_COMPOSITE_ROLES,
};

export const fields: ESLintConfiguration = [
  Object.entries(allowlist).map(([field, defaultValue]) => ({
    field,
    default: defaultValue,
  })),
];
