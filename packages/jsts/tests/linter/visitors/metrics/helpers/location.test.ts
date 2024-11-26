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
import estree from 'estree';
import { convertLocation } from '../../../../../src/linter/visitors/metrics/helpers/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

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
