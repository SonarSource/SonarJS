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
import {
  hasSonarContextOption,
  SONAR_CONTEXT,
} from '../../../src/linter/parameters/sonar-context.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('hasSonarContextOption', () => {
  it('should return true for a rule that has `sonar-context` option', () => {
    expect(
      hasSonarContextOption({ meta: { schema: [{ title: SONAR_CONTEXT }] } } as any, 'fake'),
    ).toEqual(true);
  });

  it('should return false for a rule that has not `sonar-context` option', () => {
    expect(hasSonarContextOption({ meta: { schema: [{ title: 42 }] } } as any, 'fake')).toEqual(
      false,
    );
  });

  it('should return false for a rule without any schema', () => {
    expect(hasSonarContextOption({ meta: {} } as any, 'fake')).toEqual(false);
  });
});
