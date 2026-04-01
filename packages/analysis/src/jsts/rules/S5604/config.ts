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
// https://sonarsource.github.io/rspec/#/rspec/S5604/javascript

import type { ESLintConfiguration } from '../helpers/configs.js';

export const fields = [
  [
    {
      field: 'permissions',
      items: {
        type: 'string',
      },
      description:
        'Comma-separated list of intrusive permissions to report (supported values: geolocation, camera, microphone, notifications, persistent-storage)',
      default: ['geolocation'],
    },
  ],
] as const satisfies ESLintConfiguration;
