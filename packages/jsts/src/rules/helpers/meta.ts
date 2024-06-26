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

import { Rule } from 'eslint';
import { docsUrl } from './docs-url';

const path =
  'sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/S100.json';
const sonarWayProfile =
  'sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/Sonar_way_profile.json';

export function generateMeta(filename: string): Rule.RuleMetaData {
  return {
    messages: {
      useOppositeOperator: 'Use the opposite operator ({{invertedOperator}}) instead.',
      suggestOperationInversion: 'Invert inner operation (apply if NaN is not expected)',
    },
    schema: [],
    type: 'suggestion',
    docs: {
      description: 'Boolean checks should not be inverted',
      recommended: true,
      url: docsUrl(__filename),
    },
    hasSuggestions: true,
    fixable: 'code',
  };
}
