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
import { join } from 'path';
import { embeddedInput } from '../../../jsts/tests/tools/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { parseHTML } from '../../src/parser/parse.js';
import { buildSourceCodes } from '../../../jsts/src/embedded/builder/build.js';

describe('buildSourceCodes()', () => {
  const fixturesPath = join(import.meta.dirname, 'fixtures');
  it('should build source codes from an HTML file', async () => {
    const filePath = join(fixturesPath, 'multiple.html');
    const sourceCodes = buildSourceCodes(await embeddedInput({ filePath }), parseHTML);
    expect(sourceCodes).toHaveLength(2);
    expect(sourceCodes[0].ast.loc.start).toEqual({ line: 4, column: 8 });
    expect(sourceCodes[1].ast.loc.start).toEqual({ line: 8, column: 8 });
  });
});
