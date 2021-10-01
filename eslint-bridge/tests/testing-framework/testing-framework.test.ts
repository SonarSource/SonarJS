/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import * as path from 'path';
import { readAssertions } from '../../src/testing-framework/assertions';

describe('Comment-based Testing Framework', () => {

  const baseDir = path.resolve(`${__dirname}/../fixtures/testing-framework`);

  // it('non compliant', () => {
  //   expect(assertions('non_compliant.js')).toEqual({});
  // });

  // it('issue message', () => {
  //   expect(assertions('message.js')).toEqual({});
  // });

  // it('multiple issue message', () => {
  //   expect(assertions('multiple.js')).toEqual({});
  // });

  // it('issue count', () => {
  //   expect(assertions('count.js')).toEqual({});
  // });

  // it('mixing message and count', () => {
  //   expect(assertions('mix.js')).toEqual({});
  // });

  // it('primary', () => {
  //   expect(assertions('primary.js')).toEqual({});
  // });

  // it('secondary', () => {
  //   expect(assertions('secondary.js')).toEqual({});
  // });

  // it('line adjustment', () => {
  //   expect(assertions('adjustment.js')).toEqual({});
  // });

  // it('conflictual primary', () => {
  //   expect(assertions('conflict.js')).toEqual({});
  // });

  // it('orphan location', () => {
  //   expect(assertions('orphan0.js')).toEqual({});
  //   expect(assertions('orphan1.js')).toEqual({});
  //   expect(assertions('orphan2.js')).toEqual({});
  // });

  function assertions(filename: string) {
    const filePath = path.join(baseDir, filename);
    return readAssertions(filePath);
  }
});
