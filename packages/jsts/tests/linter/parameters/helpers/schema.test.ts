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
import type { Rule } from 'eslint';
import { getRuleSchema } from '../../../../src/linter/parameters/helpers/index.js';
import { describe, it, mock, Mock } from 'node:test';
import { expect } from 'expect';

describe('getRuleSchema', () => {
  it('should return the schema', () => {
    expect(
      getRuleSchema({ meta: { schema: [42] } } as unknown as Rule.RuleModule, 'schema'),
    ).toEqual([42]);
  });

  it('should return undefined on an undefined rule', () => {
    console.log = mock.fn();
    expect(getRuleSchema(undefined, 'undefined-rule')).toBeUndefined();
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain(`DEBUG ruleModule not found for rule undefined-rule`);
  });

  it('should return undefined on a meta-less rule', () => {
    expect(getRuleSchema({ meta: undefined } as Rule.RuleModule, 'meta-less')).toBeUndefined();
  });

  it('should return undefined on a schema-less rule', () => {
    expect(
      getRuleSchema({ meta: { schema: undefined } } as Rule.RuleModule, 'schema-less'),
    ).toBeUndefined();
  });
});
