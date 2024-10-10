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
import { debug, error, info, warn } from '../../src/helpers/logging.js';
import { describe, it, mock, Mock } from 'node:test';
import { expect } from 'expect';

describe('debug', () => {
  it('should log with a `DEBUG` prefix', () => {
    console.log = mock.fn();
    debug('hello, world!');
    expect((console.log as Mock<typeof console.log>).mock.calls[0].arguments[0]).toEqual(
      `DEBUG hello, world!`,
    );
  });
});

describe('error', () => {
  it('should log to stderr', () => {
    console.error = mock.fn();
    error('hello, world!');
    expect((console.error as Mock<typeof console.error>).mock.calls[0].arguments[0]).toEqual(
      `hello, world!`,
    );
  });
});

describe('warn', () => {
  it('should log with a `WARN` prefix', () => {
    console.log = mock.fn();
    warn('hello, world!');
    expect((console.log as Mock<typeof console.log>).mock.calls[0].arguments[0]).toEqual(
      `WARN hello, world!`,
    );
  });
});

describe('info', () => {
  it('should log with no prefix', () => {
    console.log = mock.fn();
    info('hello, world!');
    expect((console.log as Mock<typeof console.log>).mock.calls[0].arguments[0]).toEqual(
      `hello, world!`,
    );
  });
});
