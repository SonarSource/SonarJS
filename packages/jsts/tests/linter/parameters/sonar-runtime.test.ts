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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { hasSonarRuntimeOption } from '../../../src/linter/parameters/sonar-runtime.js';
import { SONAR_RUNTIME } from '../../../src/rules/index.js';

describe('hasSonarRuntimeOption', () => {
  it('should return true for a rule that has `sonar-runtime` option', () => {
    expect(
      hasSonarRuntimeOption({ meta: { schema: [{ enum: [SONAR_RUNTIME] }] } } as any, 'fake'),
    ).toEqual(true);
  });

  it('should return false for a rule that has not `sonar-runtime` option', () => {
    expect(hasSonarRuntimeOption({ meta: { schema: [{ enum: [42] }] } } as any, 'fake')).toEqual(
      false,
    );
  });

  it('should return false for a rule without any schema', () => {
    expect(hasSonarRuntimeOption({ meta: {} } as any, 'fake')).toEqual(false);
  });
});
