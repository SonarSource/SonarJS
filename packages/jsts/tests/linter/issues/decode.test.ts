/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { decodeSecondaryLocations } from '../../../src/linter/issues/decode.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { SonarMeta } from '../../../src/rules/helpers/index.js';
import { Issue } from '../../../src/linter/issues/issue.js';

describe('decodeSecondaryLocations', () => {
  it('should decode sonar-runtime-like issues', () => {
    const rule = { meta: {}, hasSecondaries: true } as SonarMeta;
    const encoded = {
      ruleId: 'fake',
      message: JSON.stringify({
        foo: 42,
      }),
    } as Issue;
    const decoded = decodeSecondaryLocations(rule, encoded) as any;
    expect(decoded).toEqual({
      ruleId: 'fake',
      foo: 42,
      message: '{"foo":42}',
    });
  });

  it('should fail decoding malformed sonar-runtime-like issues', () => {
    const rule = { meta: {}, hasSecondaries: true } as SonarMeta;
    const malformed = {
      ruleId: 'fake',
      message: '{...',
    } as Issue;
    expect(() => decodeSecondaryLocations(rule, malformed)).toThrow(
      /^Failed to parse encoded issue message for rule fake/,
    );
  });

  it('should return undecoded issues from a rule that does not activate sonar-runtime', () => {
    const issue = { ruleId: 'fake', line: 42 } as Issue;
    expect(decodeSecondaryLocations(undefined, issue)).toEqual(issue);
  });
});
