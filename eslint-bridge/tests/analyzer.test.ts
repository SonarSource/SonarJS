/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import {
  analyzeJavaScript,
  analyzeTypeScript,
  getCognitiveComplexity,
  getHighlightedSymbols,
  initLinter,
} from '../src/analyzer';
import { join } from 'path';
import * as fs from 'fs';

const noOneIterationIssue = {
  line: 3,
  column: 2,
  endLine: 3,
  endColumn: 5,
  message: 'Refactor this loop to do more than one iteration.',
  ruleId: 'no-one-iteration-loop',
  secondaryLocations: [],
};

const noDuplicateStringIssue = {
  line: 7,
  column: 6,
  endLine: 7,
  endColumn: 20,
  message: 'Define a constant instead of duplicating this literal 2 times.',
  ruleId: 'no-duplicate-string',
  secondaryLocations: [],
};
const noUnnecessaryTypeAssertionIssue = {
  line: 1,
  column: 11,
  endLine: 1,
  endColumn: 22,
  message: 'This assertion is unnecessary since it does not change the type of the expression.',
  ruleId: 'no-unnecessary-type-assertion',
  secondaryLocations: [],
};

describe('#analyzeJavaScript', () => {
  const filePath = join(__dirname, './fixtures/js-project/sample.lint.js');
  const codeToTest = fs.readFileSync(filePath, { encoding: 'utf8' });

  it('should report issue running eslint', () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [] },
      { key: 'no-duplicate-string', configurations: ['2'] },
    ]);
    const { issues } = analyzeJavaScript({
      filePath,
      fileContent: codeToTest,
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it('should not report issue when not receiving corresponding rule-key', () => {
    initLinter([{ key: 'no-all-duplicated-branches', configurations: [] }]);
    const { issues } = analyzeJavaScript({
      filePath,
      fileContent: codeToTest,
    });
    expect(issues).toHaveLength(0);
  });

  it('should report syntax highlights', () => {
    initLinter([{ key: 'no-all-duplicated-branches', configurations: [] }]);
    const highlights = analyzeJavaScript({
      filePath,
      fileContent: codeToTest,
    }).highlights;
    expect(highlights).toHaveLength(10);
  });

  it('should report cpd tokens', () => {
    initLinter([{ key: 'no-all-duplicated-branches', configurations: [] }]);
    const cpdTokens = analyzeJavaScript({
      filePath,
      fileContent: codeToTest,
    }).cpdTokens;
    expect(cpdTokens).toHaveLength(42);
  });

  it('should return empty list when parse error', () => {
    initLinter([{ key: 'no-all-duplicated-branches', configurations: [] }]);
    const { issues } = analyzeJavaScript({
      filePath,
      fileContent: `if()`,
    });
    expect(issues).toHaveLength(0);
  });

  it('should analyze shebang file', () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [] },
      { key: 'no-duplicate-string', configurations: ['2'] },
    ]);
    const { issues } = analyzeJavaScript({
      filePath: join(__dirname, 'fixtures/js-project/shebang.lint.js'),
      fileContent: undefined,
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it('should analyze Vue.js file', () => {
    const filePath = join(__dirname, './fixtures/vue-project/sample.lint.vue');
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [] },
      { key: 'no-duplicate-string', configurations: ['2'] },
    ]);
    const { issues } = analyzeJavaScript({
      filePath: filePath,
      fileContent: fileContent,
    });
    expect(issues).toHaveLength(2);
  });

  it('should handle BOM', () => {
    const filePath = join(__dirname, './fixtures/js-project/fileWithBom.lint.js');

    initLinter([]);
    const cpdTokens = analyzeJavaScript({
      filePath,
      fileContent: undefined,
    }).cpdTokens;
    expect(cpdTokens).toHaveLength(17);
    const firstLineEnd = Math.max(
      ...cpdTokens
        .filter(token => token.location.startLine == 1)
        .map(token => token.location.endCol),
    );
    expect(firstLineEnd).toBe(11);
  });

  it('should throw without init-linter', () => {
    try {
      jest.resetModules();
      const analyzer = require('../src/analyzer');
      analyzer.analyzeJavaScript({
        filePath,
        fileContent: codeToTest,
      });
      fail('this test should throw error');
    } catch (e) {
      expect(e.message).toBe('Linter is undefined. Did you call /init-linter?');
    }
  });

  it('should report exception from TypeScript compiler as parsing error', () => {
    const filePath = join(__dirname, './fixtures/failing-typescript/sample.lint.js');
    const tsConfig = join(__dirname, './fixtures/failing-typescript/tsconfig.json');
    const codeToTest = fs.readFileSync(filePath, { encoding: 'utf8' });

    initLinter([{ key: 'arguments-order', configurations: [] }]);
    const { parsingError } = analyzeJavaScript({
      filePath: filePath,
      fileContent: codeToTest,
      tsConfigs: [tsConfig],
    });
    expect(parsingError).toBeDefined();
    expect(parsingError.message).toContain('Debug Failure');
  });
});

describe('#analyzeTypeScript', () => {
  const filePath = join(__dirname, './fixtures/ts-project/sample.lint.ts');
  const tsConfig = join(__dirname, './fixtures/ts-project/tsconfig.json');
  const codeToTest = fs.readFileSync(filePath, { encoding: 'utf8' });

  it('should report issue running eslint', () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [] },
      { key: 'no-duplicate-string', configurations: ['2'] },
    ]);
    const { issues } = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it('should report issue using type-checker', () => {
    initLinter([{ key: 'no-unnecessary-type-assertion', configurations: [] }]);
    const { issues } = analyzeTypeScript({
      filePath: filePath,
      fileContent: `let x = 4; x as number;`,
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(1);
    expect(issues).toContainEqual(noUnnecessaryTypeAssertionIssue);
  });

  it('should read file content from fs when not provided', () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [] },
      { key: 'no-duplicate-string', configurations: ['2'] },
    ]);
    const { issues } = analyzeTypeScript({
      filePath: filePath,
      fileContent: undefined,
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it('should normalize provided path', () => {
    initLinter([{ key: 'no-all-duplicated-branches', configurations: [] }]);
    let result = analyzeTypeScript({
      filePath: __dirname + '/./fixtures/ts-project/sample.lint.ts',
      fileContent: 'true ? 42 : 42',
      tsConfigs: [tsConfig],
    });
    expect(result.issues).toHaveLength(1);

    initLinter([{ key: 'no-all-duplicated-branches', configurations: [] }]);
    result = analyzeTypeScript({
      filePath: __dirname + '/././fixtures/ts-project/sample.lint.ts',
      fileContent: 'true ? 42 : 24',
      tsConfigs: [tsConfig],
    });
    // fileContent doesn't have the issue anymore, without path normalization we receive the AST from the first request
    expect(result.issues).toHaveLength(0);
  });

  it('should report syntax highlights', () => {
    initLinter([]);
    const highlights = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      tsConfigs: [tsConfig],
    }).highlights;
    expect(highlights).toHaveLength(10);
  });

  it('should report symbol highlighting', () => {
    initLinter([]);
    const highlightedSymbols = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      tsConfigs: [tsConfig],
    }).highlightedSymbols;
    expect(highlightedSymbols).toHaveLength(3);
  });

  it('should report cpd tokens', () => {
    initLinter([]);
    const cpdTokens = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      tsConfigs: [tsConfig],
    }).cpdTokens;
    expect(cpdTokens).toHaveLength(42);
  });

  it('should report cognitive complexity', () => {
    initLinter([]);
    const cognitiveComplexity = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      tsConfigs: [tsConfig],
    }).metrics.cognitiveComplexity;
    expect(cognitiveComplexity).toEqual(1);
  });

  it('should not report issue when not receiving corresponding rule-key', () => {
    initLinter([]);
    const { issues } = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(0);
  });

  it('should return empty issues list when parse error', () => {
    initLinter([{ key: 'no-all-duplicated-branches', configurations: [] }]);
    const { issues, parsingError } = analyzeTypeScript({
      filePath: filePath,
      fileContent: `if()`,
      tsConfigs: [],
    });
    expect(issues).toHaveLength(0);
    expect(parsingError.line).toBe(1);
    expect(parsingError.message).toBe('Expression expected.');
  });

  it('should return empty list with highlighted symbols when issue is not found', () => {
    console.log = jest.fn();
    expect(getHighlightedSymbols([])).toHaveLength(0);
    expect(console.log).toHaveBeenCalledWith(
      'DEBUG Failed to retrieve symbol highlighting from analysis results',
    );
    jest.resetAllMocks();
  });

  it('should return 0 for cognitive complexity when issue is not found', () => {
    console.log = jest.fn();
    expect(getCognitiveComplexity([])).toEqual(0);
    expect(console.log).toHaveBeenCalledWith(
      'DEBUG Failed to retrieve cognitive complexity metric from analysis results',
    );
    jest.resetAllMocks();
  });

  it('should return 0 for cognitive complexity when message is not numeric', () => {
    console.log = jest.fn();
    expect(
      getCognitiveComplexity([
        {
          ruleId: 'internal-cognitive-complexity',
          message: 'nan',
          column: 0,
          line: 0,
          secondaryLocations: [],
        },
      ]),
    ).toEqual(0);
    expect(console.log).toHaveBeenCalledWith(
      'DEBUG Failed to retrieve cognitive complexity metric from analysis results',
    );
    jest.resetAllMocks();
  });
});
