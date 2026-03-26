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
import { collectMainFileArtifacts } from '../../../src/analysis/file-artifacts.js';
import type { CpdToken } from '../../../src/analysis/file-artifacts.js';
import { parse } from '../../../src/parsers/parse.js';
import { parsersMap } from '../../../src/parsers/eslint.js';

describe('collectMainFileArtifacts', () => {
  it('should compute metrics', async () => {
    const sourceCode = parseSourceCode(METRICS_FIXTURE);
    expect(collectMainFileArtifacts(sourceCode, true, 42).metrics).toEqual({
      classes: 1,
      commentLines: [6],
      complexity: 2,
      cognitiveComplexity: 42,
      executableLines: [8],
      functions: 1,
      ncloc: [5, 7, 8, 9, 10],
      nosonarLines: [7],
      statements: 1,
    });
  });

  it('should find all cpd tokens', async () => {
    expect(await tokens('token.js')).toEqual([
      token(1, 0, 1, 2, 'if'),
      token(1, 3, 1, 4, '('),
      token(1, 4, 1, 8, 'true'),
      token(1, 8, 1, 9, ')'),
      token(2, 0, 2, 3, 'foo'),
      token(2, 3, 2, 4, '('),
      token(2, 4, 2, 5, ')'),
      token(2, 5, 2, 6, ';'),
    ]);
  });

  it('should ignore comments for cpd', async () => {
    expect(await tokens('comment.js')).toEqual([
      token(1, 0, 1, 1, 'a'),
      token(4, 0, 4, 1, 'b'),
      token(14, 0, 14, 1, 'c'),
    ]);
  });

  it('should anonymize string literals for cpd', async () => {
    expect(images(await tokens('string.js'))).toEqual(
      expect.arrayContaining([
        'LITERAL', // 'string'
        'LITERAL', // `string`
        'LITERAL', // "string"
        '42',
        'true',
      ]),
    );
  });

  it('should find JSX cpd tokens', async () => {
    expect(images(await tokens('jsx.js'))).toEqual(expect.arrayContaining(['<', 'foo', '/', '>']));
  });

  it('should preserve JSX string literals for cpd', async () => {
    expect(images(await tokens('string-jsx.js'))).toEqual(
      expect.arrayContaining([
        'LITERAL', // 'hello'
        '"abc"',
        'LITERAL', // "def"
        'LITERAL', // "ghi"
        'LITERAL', // "jkl"
        'LITERAL', // 'str'
      ]),
    );
  });

  it('should ignore import statements for cpd', async () => {
    expect(images(await tokens('import.js'))).toEqual(['import', '(', 'lib', ')', ';']);
  });

  it('should ignore require declarations for cpd', async () => {
    expect(images(await tokens('require.js'))).toHaveLength(0);
  });
});

async function tokens(filename: string): Promise<CpdToken[]> {
  const sourceCode = parseSourceCode(CPD_FIXTURES[filename]);
  return collectMainFileArtifacts(sourceCode, false).cpdTokens;
}

function token(
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
  image: string,
): CpdToken {
  return {
    location: {
      startLine,
      startCol,
      endLine,
      endCol,
    },
    image,
  };
}

function images(cpdTokens: CpdToken[]): string[] {
  return cpdTokens.map(cpdToken => cpdToken.image);
}

function parseSourceCode(code: string) {
  return parse(code, parsersMap.typescript, {
    comment: true,
    loc: true,
    range: true,
    tokens: true,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  }).sourceCode;
}

const METRICS_FIXTURE = `/**
 * header
 */

class C {
  /* return 'foo' */
  m = function() { // NOSONAR
    return foo() || bar();
  };
}
`;

const CPD_FIXTURES: Record<string, string> = {
  'token.js': `if (true)
foo();
`,
  'comment.js': `a // comment1
/*comment2*/
// comment3
b // comment4
/**
 * comment5
 */
/**
 * Shift down
 * @param  {Array} array
 * @param  {Number} i
 * @param  {Number} j
 */
c
// comment6
`,
  'string.js': `'string';
\`string\`;
"string";
42;
true;
`,
  'jsx.js': `<foo/>`,
  'string-jsx.js': `const str = 'hello';
<foo bar="abc">
  {"def"}
  {..."ghi"}
  <baz {...getAttributes("jkl")} />
  <Qux xyz={'str'}/>
</foo>
`,
  'import.js': `import a from "x";
import b from "y";
import { c } from "z";
import "lib";
import(lib);
`,
  'require.js': `const foo = require('foo');
const bar = require('bar')(42);
const baz = require('baz').baz;
const qux = require('qux').qux(42);
`,
};
