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
import { debug, error, info, warn } from '../../src/helpers/index.ts';

describe('debug', () => {
  it('should log with a `DEBUG` prefix', () => {
    console.log = jest.fn();
    debug('hello, world!');
    expect(console.log).toHaveBeenCalledWith(`DEBUG hello, world!`);
  });
});

describe('error', () => {
  it('should log to stderr', () => {
    console.error = jest.fn();
    error('hello, world!');
    expect(console.error).toHaveBeenCalledWith(`hello, world!`);
  });
});

describe('warn', () => {
  it('should log with a `WARN` prefix', () => {
    console.log = jest.fn();
    warn('hello, world!');
    expect(console.log).toHaveBeenCalledWith(`WARN hello, world!`);
  });
});

describe('info', () => {
  it('should log with no prefix', () => {
    console.log = jest.fn();
    info('hello, world!');
    expect(console.log).toHaveBeenCalledWith(`hello, world!`);
  });
});
