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
// https://typedoc.org/guides/options
export default {
  entryPoints: ['../packages/jsts/src/rules/helpers/index.ts'],
  name: 'SonarJS linter helper functions',
  out: './site',
  searchInComments: true,
  plugin: ['searchable-parameters-plugin'],
  readme: './main.md',
  tsconfig: '../tsconfig-plugin.json',
  json: 'models/reflections.json',
  pretty: true,
  sidebarLinks: {
    'ESlint dev guide': 'https://eslint.org/docs/latest/developer-guide/working-with-rules',
  },
  skipErrorChecking: true,
  visibilityFilters: {},
};
