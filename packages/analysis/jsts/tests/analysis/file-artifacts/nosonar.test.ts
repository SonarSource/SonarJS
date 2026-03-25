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
import { collectNoSonarMetrics } from '../../../src/analysis/file-artifacts.js';
import { buildParserOptions } from '../../../src/parsers/options.js';
import { parse } from '../../../src/parsers/parse.js';
import { parsersMap } from '../../../src/parsers/eslint.js';

describe('collectNoSonarMetrics', () => {
  it('should find NOSONAR comment lines', () => {
    const sourceCode = parseJavaScriptSource(`x; // NoSonar foo
y; /* NOSONAR */
// NOSONAR
z; // NOOOSONAR
z; // some comment`);
    const { nosonarLines } = collectNoSonarMetrics(sourceCode);
    expect(nosonarLines).toEqual([1, 2, 3]);
  });
});

function parseJavaScriptSource(source: string) {
  return parse(source, parsersMap.typescript, buildParserOptions({}, false)).sourceCode;
}
