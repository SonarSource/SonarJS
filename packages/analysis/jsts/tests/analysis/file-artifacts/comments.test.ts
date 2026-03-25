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
import { collectMainFileArtifacts } from '../../../src/analysis/file-artifacts.js';
import { buildParserOptions } from '../../../src/parsers/options.js';
import { parse } from '../../../src/parsers/parse.js';
import { parsersMap } from '../../../src/parsers/eslint.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

const cases = [
  {
    given: 'with header ignoring and no header comment',
    ignoreHeader: true,
    expectedLines: [5, 6],
    source: `x; // NoSonar foo
y; /* NOSONAR */
// NOSONAR

z; // NOOOSONAR
z; // some comment

//   

/*  
    */
    
/**   */`,
  },
  {
    given: 'with header ignoring and block header comment',
    ignoreHeader: true,
    expectedLines: [3, 4, 5],
    source: `/* header */
x;
y; /*
  some comment
*/`,
  },
  {
    given: 'with header ignoring and special block header comment',
    ignoreHeader: true,
    expectedLines: [3, 4, 5],
    source: `/** header */
x;
y; /*
  some comment
*/`,
  },
  {
    given: 'with header ignoring and line header comment',
    ignoreHeader: true,
    expectedLines: [3, 4, 5],
    source: `// header
x;
y; /*
  some comment
*/`,
  },
  {
    given: 'without header ignoring and block header comment',
    ignoreHeader: false,
    expectedLines: [1, 3, 4, 5],
    source: `/* header */
x;
y; /*
some comment
*/`,
  },
  {
    given: 'without header ignoring and no header comment',
    ignoreHeader: false,
    expectedLines: [2, 3, 4],
    source: `x;
y; /*
some comment
*/`,
  },
];

describe('collectMainFileArtifacts (comment metrics)', () => {
  for (const { given, source, ignoreHeader, expectedLines } of cases)
    it(`should find comment lines ${given}`, () => {
      const sourceCode = parseJavaScriptSource(source);
      const { commentLines: actualLines } = collectMainFileArtifacts(
        sourceCode,
        ignoreHeader,
      ).metrics;
      expect(actualLines).toEqual(expectedLines);
    });
});

function parseJavaScriptSource(source: string) {
  return parse(source, parsersMap.typescript, buildParserOptions({}, false)).sourceCode;
}
