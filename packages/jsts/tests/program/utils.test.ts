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
import path from 'node:path/posix';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { toUnixPath } from '../../src/rules/helpers/index.js';
import {
  isRootNodeModules,
  isLastTsConfigCheck,
  sanitizeProgramReferences,
  sanitizeReferences,
} from '../../src/program/tsconfig/utils.js';
import { createProgramOptions } from '../../src/program/tsconfig/options.js';
import { createStandardProgram } from '../../src/program/factory.js';

const fixtures = path.join(toUnixPath(import.meta.dirname), 'fixtures');

describe('tsconfig utils', () => {
  // Platform-specific root paths for testing
  const isWindows = process.platform === 'win32';
  const rootNodeModules = isWindows ? 'C:/node_modules' : '/node_modules';
  const nestedNodeModules = isWindows ? 'C:/project/node_modules' : '/project/node_modules';
  const projectPath = isWindows ? 'C:/project' : '/project';

  describe('isRootNodeModules', () => {
    it('should return true for root node_modules', () => {
      expect(isRootNodeModules(`${rootNodeModules}/something`)).toBe(true);
      expect(isRootNodeModules(`${rootNodeModules}/@types/node`)).toBe(true);
    });

    it('should return false for nested node_modules', () => {
      expect(isRootNodeModules(`${nestedNodeModules}/something`)).toBe(false);
      expect(isRootNodeModules(`${projectPath}/deep/node_modules/package`)).toBe(false);
    });

    it('should return false for non-node_modules paths', () => {
      expect(isRootNodeModules(`${projectPath}/src/index.ts`)).toBe(false);
      expect(isRootNodeModules(`${projectPath}/file.ts`)).toBe(false);
    });
  });

  describe('isLastTsConfigCheck', () => {
    it('should return true for tsconfig.json in root node_modules', () => {
      expect(isLastTsConfigCheck(`${rootNodeModules}/something/tsconfig.json`)).toBe(true);
      expect(isLastTsConfigCheck(`${rootNodeModules}/@tsconfig/bases/tsconfig.json`)).toBe(true);
    });

    it('should return false for tsconfig.json not in root node_modules', () => {
      expect(isLastTsConfigCheck(`${projectPath}/tsconfig.json`)).toBe(false);
      expect(isLastTsConfigCheck(`${nestedNodeModules}/package/tsconfig.json`)).toBe(false);
    });

    it('should return false for non-tsconfig files', () => {
      expect(isLastTsConfigCheck(`${rootNodeModules}/package/package.json`)).toBe(false);
      expect(isLastTsConfigCheck(`${rootNodeModules}/package/index.ts`)).toBe(false);
    });
  });

  describe('sanitizeReferences', () => {
    it('should return empty array for empty references', () => {
      const result = sanitizeReferences([]);
      expect(result).toEqual([]);
    });

    it('should resolve directory references to tsconfig.json', () => {
      const reference = path.join(fixtures, 'reference');
      const result = sanitizeReferences([{ path: reference }]);

      expect(result).toEqual([path.join(reference, 'tsconfig.json')]);
    });

    it('should filter out missing references', () => {
      const result = sanitizeReferences([{ path: '/nonexistent/path' }]);

      expect(result).toEqual([]);
    });

    it('should handle mixed valid and invalid references', () => {
      const validReference = path.join(fixtures, 'reference');
      const result = sanitizeReferences([{ path: validReference }, { path: '/nonexistent/path' }]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(path.join(validReference, 'tsconfig.json'));
    });
  });

  describe('sanitizeProgramReferences', () => {
    it('should extract and sanitize references from program', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');
      const programOptions = createProgramOptions(tsConfig);
      const program = createStandardProgram(programOptions);

      const references = sanitizeProgramReferences(program);

      expect(references).toContain(path.join(fixtures, 'reference', 'tsconfig.json'));
    });

    it('should skip missing references in program', () => {
      const tsConfig = path.join(fixtures, 'tsconfig_missing_reference.json');
      const programOptions = createProgramOptions(tsConfig);
      const program = createStandardProgram(programOptions);

      const references = sanitizeProgramReferences(program);

      expect(references).toEqual([]);
    });

    it('should return empty array for program without references', () => {
      const tsConfig = path.join(fixtures, 'tsconfig_found.json');
      const programOptions = createProgramOptions(tsConfig);
      const program = createStandardProgram(programOptions);

      const references = sanitizeProgramReferences(program);

      expect(references).toEqual([]);
    });
  });
});
