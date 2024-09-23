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
import * as estree from 'estree';
import { convertLocation } from '../../../../../src/linter/visitors/metrics/helpers/index.js';

describe('convertLocation', () => {
  it('should convert an ESTree location', () => {
    const location: estree.SourceLocation = {
      start: {
        line: 42,
        column: 42_42,
      },
      end: {
        line: 24,
        column: 24_24,
      },
    };
    const convertedLocation = convertLocation(location);
    expect(convertedLocation).toEqual({
      startLine: 42,
      startCol: 42_42,
      endLine: 24,
      endCol: 24_24,
    });
  });
});
