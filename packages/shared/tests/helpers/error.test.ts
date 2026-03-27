/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sarl
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
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import { handleError, normalizeError } from '../../src/helpers/error.js';
import { APIError } from '../../../analysis/src/contracts/error.js';

describe('normalizeError', () => {
  it('should return object as-is for object input', () => {
    expect(normalizeError({ message: 'oops', stack: 'stack-trace' })).toEqual({
      message: 'oops',
      stack: 'stack-trace',
    });
  });

  it('should return message for string input', () => {
    expect(normalizeError('boom')).toEqual({ message: 'boom' });
  });

  it('should return default message for unknown input', () => {
    expect(normalizeError(42)).toEqual({ message: 'Unexpected error' });
  });
});

describe('handleError', () => {
  it('should return an error object with the normalized message', () => {
    expect(handleError('boom')).toEqual({ error: 'boom' });
  });

  it('should log stack traces', ({ mock }) => {
    console.error = mock.fn(() => {}) as Mock<typeof console.error>;

    expect(handleError({ message: 'boom', stack: 'stack-trace' })).toEqual({
      error: 'boom',
    });
    expect((console.error as Mock<typeof console.error>).mock.calls[0].arguments[0]).toEqual(
      'stack-trace',
    );
  });

  it('should return an error object for parsing API errors', () => {
    expect(
      handleError(APIError.parsingError('Unexpected token "{"', { line: 42, column: 7 })),
    ).toEqual({
      error: 'Unexpected token "{"',
    });
  });
});
