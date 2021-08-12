/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { join } from 'path';
import { analyzeJavaScript, analyzeTypeScript, initLinter } from 'analyzer';
import { HighlightedSymbol } from 'runner/symbol-highlighter';
import { Location } from 'runner/location';
import { setContext } from 'context';

setContext({
  workDir: '/tmp/workdir',
  shouldUseTypeScriptParserForJS: true,
  sonarlint: false,
});

it('should highlight variable references', () => {
  const result = actual(
    `let x = 32;
foo(x);
var x = 0;
x = 42;
`,
  );
  expect(result).toHaveLength(1);
  expect(result[0].declaration).toEqual(location(1, 4, 1, 5));
  expect(result[0].references).toHaveLength(3);
  expect(result[0].references[0]).toEqual(location(2, 4, 2, 5));
  expect(result[0].references[1]).toEqual(location(3, 4, 3, 5));
  expect(result[0].references[2]).toEqual(location(4, 0, 4, 1));
});

it('should highlight parameter references', () => {
  const result = actual(`function foo(p: number) { return p; }`);
  expect(result).toHaveLength(3);
  expect(result[0].declaration).toEqual(location(1, 9, 1, 12));
  expect(result[0].references).toHaveLength(0);

  expect(result[1].declaration).toEqual(location(1, 13, 1, 14));
  expect(result[1].references).toHaveLength(1);
  expect(result[1].references[0]).toEqual(location(1, 33, 1, 34));
});

it('should highlight variable declared with type', () => {
  const result = actual(`let x: number = 42;`);
  expect(result).toHaveLength(1);
  expect(result[0].declaration).toEqual(location(1, 4, 1, 5));
  expect(result[0].references).toHaveLength(0);
});

it('should highlight unused variable', () => {
  const result = actual(`let x;`);
  expect(result).toHaveLength(1);
  expect(result[0].declaration).toEqual(location(1, 4, 1, 5));
  expect(result[0].references).toHaveLength(0);
});

it('should not highlight variable without declaration', () => {
  const result = actual(`foo(x);`);
  expect(result).toHaveLength(0);
});

it('should highlight imported symbol', () => {
  const result = actual(`import { x } from "hello"; \nx();`);
  expect(result).toHaveLength(2);
  expect(result[0].declaration).toEqual(location(1, 9, 1, 10));
  expect(result[0].references).toHaveLength(1);
  expect(result[0].references[0]).toEqual(location(2, 0, 2, 1));
});

it('should highlight curly brackets', () => {
  const result = actual(`
(function () {
  if (true) {
    return {};
  }
})();
  `);
  result.sort((a, b) => a.declaration.startLine - b.declaration.startLine);
  expect(result).toHaveLength(3);
  expect(result[0].declaration).toEqual(location(2, 13, 2, 14));
  expect(result[0].references).toHaveLength(1);
  expect(result[0].references[0]).toEqual(location(6, 0, 6, 1));
  expect(result[1].declaration).toEqual(location(3, 12, 3, 13));
  expect(result[1].references).toHaveLength(1);
  expect(result[1].references[0]).toEqual(location(5, 2, 5, 3));
  expect(result[2].declaration).toEqual(location(4, 11, 4, 12));
  expect(result[2].references).toHaveLength(1);
  expect(result[2].references[0]).toEqual(location(4, 12, 4, 13));
});

it('should highlight constructor', () => {
  expect(
    actual(`
    var XMLHttpRequest: {
      new(): XMLHttpRequest;
    };
    interface XMLHttpRequest  {}
    `),
  ).toContainEqual({
    declaration: { endCol: 22, endLine: 2, startCol: 8, startLine: 2 },
    references: [
      { endCol: 27, endLine: 3, startCol: 13, startLine: 3 },
      { endCol: 28, endLine: 5, startCol: 14, startLine: 5 },
    ],
  });
});

it('should highlight TS enums', () => {
  expect(
    actual(`
    enum PublishSettingsType {
      'enterprise',
      'dotcom',
    }`),
  ).toContainEqual({
    declaration: { endCol: 28, endLine: 2, startCol: 9, startLine: 2 },
    references: [],
  });
});

it('should highlight Vue templates', () => {
  const filePath = '/some/path/file.vue';
  const fileContent = `
  <template>
    <foo a="v" b="w">
      <baz/> <!-- ignored: self-closing -->
    </foo>
  </template>`;

  initLinter([]);
  const { highlightedSymbols } = analyzeJavaScript({ filePath, fileContent, tsConfigs: [] });
  expect(highlightedSymbols).toEqual([
    {
      declaration: { startLine: 3, startCol: 4, endLine: 3, endCol: 8 } /* <foo */,
      references: [{ startLine: 5, startCol: 4, endLine: 5, endCol: 9 }] /* </foo */,
    },
    {
      declaration: { startLine: 2, startCol: 2, endLine: 2, endCol: 11 } /* <template */,
      references: [{ startLine: 6, startCol: 2, endLine: 6, endCol: 12 }] /* </template */,
    },
  ]);
});

it('should highlight inconsistent Vue templates', () => {
  const filePath = '/some/path/file.vue';
  const fileContent = `
  <template>
    </p>
  </template> <!-- ignored: inconsistency -->`;

  initLinter([]);
  const { highlightedSymbols } = analyzeJavaScript({ filePath, fileContent, tsConfigs: [] });
  expect(highlightedSymbols).toEqual([
    {
      declaration: { startLine: 2, startCol: 2, endLine: 2, endCol: 11 } /* <template */,
      references: [{ startLine: 3, startCol: 4, endLine: 3, endCol: 7 }] /* </p */,
    },
  ]);
});

function location(startLine: number, startCol: number, endLine: number, endCol: number): Location {
  return {
    startLine,
    startCol,
    endLine,
    endCol,
  };
}

function actual(code: string): HighlightedSymbol[] {
  const filePath = join(__dirname, '/../fixtures/ts-project/sample.lint.ts');
  const tsConfig = join(__dirname, '/../fixtures/ts-project/tsconfig.json');
  initLinter([]);
  const result = analyzeTypeScript({
    filePath,
    fileContent: code,
    tsConfigs: [tsConfig],
  });

  return result.highlightedSymbols;
}
