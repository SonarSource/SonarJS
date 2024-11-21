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
