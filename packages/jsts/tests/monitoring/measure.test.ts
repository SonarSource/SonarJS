/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { hrtime } from 'process';
import { measureDuration } from '../../src/monitoring';

describe('measureDuration', () => {
  it('should measure the running time of a function', () => {
    const spy = jest.spyOn(hrtime, 'bigint');

    const f = () => 'done';
    const { result, duration } = measureDuration(f);

    expect(result).toEqual(f());
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
