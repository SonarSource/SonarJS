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
import { Issue } from '@sonar/jsts/linter/issues';
import { decodeSonarRuntime } from '@sonar/jsts/linter/issues/decode';
import { SONAR_RUNTIME } from '@sonar/jsts/linter/parameters';

describe('decodeSonarRuntime', () => {
  it('should decode sonar-runtime-like issues', () => {
    const rule = { meta: { schema: [{ enum: [SONAR_RUNTIME] }] } } as any;
    const encoded = {
      ruleId: 'fake',
      message: JSON.stringify({
        foo: 42,
      }),
    } as Issue;
    const decoded = decodeSonarRuntime(rule, encoded) as any;
    expect(decoded).toEqual({
      ruleId: 'fake',
      foo: 42,
      message: '{"foo":42}',
    });
  });

  it('should fail decoding malformed sonar-runtime-like issues', () => {
    const rule = { meta: { schema: [{ enum: [SONAR_RUNTIME] }] } } as any;
    const malformed = {
      ruleId: 'fake',
      message: '{...',
    } as Issue;
    expect(() => decodeSonarRuntime(rule, malformed)).toThrow(
      /^Failed to parse encoded issue message for rule fake/,
    );
  });

  it('should return undecoded issues from a rule that does not activate sonar-runtime', () => {
    const issue = { ruleId: 'fake', line: 42 } as Issue;
    expect(decodeSonarRuntime({} as any, issue)).toEqual(issue);
  });
});
