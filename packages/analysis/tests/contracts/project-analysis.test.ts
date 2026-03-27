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
import { APIError, ErrorCode } from '../../src/contracts/error.js';
import { toProjectFailureResult } from '../../src/contracts/project-analysis.js';

describe('toProjectFailureResult', () => {
  it('should convert parsing API errors to parsingErrors and log stack trace', ({ mock }) => {
    const apiError = APIError.parsingError('Unexpected token', { line: 7, column: 3 });
    apiError.stack = 'stack-trace';
    console.error = mock.fn(() => {}) as Mock<typeof console.error>;

    expect(toProjectFailureResult(apiError, 'ts')).toEqual({
      issues: [],
      parsingErrors: [
        {
          message: 'Unexpected token',
          code: ErrorCode.Parsing,
          line: 7,
          column: 3,
          language: 'ts',
        },
      ],
    });
    expect((console.error as Mock<typeof console.error>).mock.calls[0].arguments[0]).toEqual(
      'stack-trace',
    );
  });

  it('should convert generic errors to failure error and log stack trace', ({ mock }) => {
    const genericError = new Error('boom');
    genericError.stack = 'stack-trace';
    console.error = mock.fn(() => {}) as Mock<typeof console.error>;

    expect(toProjectFailureResult(genericError, 'js')).toEqual({ error: 'boom' });
    expect((console.error as Mock<typeof console.error>).mock.calls[0].arguments[0]).toEqual(
      'stack-trace',
    );
  });

  it('should preserve previous fallback for non-error values', () => {
    expect(toProjectFailureResult(42, 'js')).toEqual({ error: '42' });
  });
});
