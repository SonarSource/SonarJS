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
