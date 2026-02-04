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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { createConfiguration } from '../../src/helpers/configuration.js';

describe('createConfiguration', () => {
  it('should fail with a non-absolute baseDir', async () => {
    const baseDir = '../relative/path';
    expect(() => createConfiguration({ baseDir })).toThrow(
      new Error(`baseDir is not an absolute path: ${baseDir}`),
    );
  });
  it('baseDir is mandatory', async () => {
    expect(() => createConfiguration({})).toThrow(
      new Error('baseDir is required and must be a string'),
    );
  });
  it('baseDir must be a string', async () => {
    expect(() => createConfiguration({ baseDir: 123 })).toThrow(
      new Error('baseDir is required and must be a string'),
    );
  });
});
