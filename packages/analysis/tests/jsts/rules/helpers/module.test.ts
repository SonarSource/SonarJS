/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { afterEach, describe, it } from 'node:test';
import { expect } from 'expect';
import { parse } from '../../../../src/jsts/parsers/parse.js';
import { parsersMap } from '../../../../src/jsts/parsers/eslint.js';
import { buildTsParserOptions } from '../../../../src/jsts/parsers/options.js';
import {
  clearFileCaches,
  getCurrentFileImports,
  getImportDeclarations,
} from '../../../../src/jsts/rules/helpers/module.js';

describe('module helpers', () => {
  afterEach(() => {
    clearFileCaches();
  });

  it('should keep TypeScript static imports visible when parsed as script', () => {
    const sourceCode = parse(
      `
import { test } from 'vitest';
const foo = require('node:assert');
`,
      parsersMap.typescript,
      buildTsParserOptions({ filePath: '/tmp/file.ts' }, { detectedModuleType: 'commonjs' }),
    ).sourceCode;

    expect(sourceCode.ast.sourceType).toBe('script');
    expect(getImportDeclarations({ sourceCode } as any).map(decl => decl.source.value)).toEqual([
      'vitest',
    ]);
    expect([...getCurrentFileImports(sourceCode)].sort()).toEqual(['node:assert', 'vitest']);
  });
});
