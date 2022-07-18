/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { Issue, normalizeLocation } from 'linting/eslint/linter/issues';

describe('normalizeLocation', () => {
  it('should normalize issue location', () => {
    const issue: Issue = {
      ruleId: '/some/rule/id',
      line: 42,
      column: 42_42,
      endColumn: 42_42_42,
      message: 'some-message',
      secondaryLocations: [],
    };
    const normalizedIssue = normalizeLocation(issue);
    expect(normalizedIssue).toEqual({
      ruleId: '/some/rule/id',
      line: 42,
      column: 42_41,
      endColumn: 42_42_41,
      message: 'some-message',
      secondaryLocations: [],
    });
  });
});
