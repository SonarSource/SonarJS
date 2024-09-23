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
import { hasSonarContextOption, SONAR_CONTEXT } from '../../../src/linter/parameters/index.js';

describe('hasSonarContextOption', () => {
  it('should return true for a rule that has `sonar-context` option', () => {
    expect(
      hasSonarContextOption({ meta: { schema: [{ title: SONAR_CONTEXT }] } } as any, 'fake'),
    ).toEqual(true);
  });

  it('should return false for a rule that has not `sonar-context` option', () => {
    expect(hasSonarContextOption({ meta: { schema: [{ title: 42 }] } } as any, 'fake')).toEqual(
      false,
    );
  });

  it('should return false for a rule without any schema', () => {
    expect(hasSonarContextOption({ meta: {} } as any, 'fake')).toEqual(false);
  });
});
