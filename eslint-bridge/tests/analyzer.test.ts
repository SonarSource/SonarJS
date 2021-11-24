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
import {
  JsAnalysisInput,
  analyzeJavaScript,
  analyzeTypeScript,
  initLinter,
  analyzeCss,
} from 'analyzer';
import path, { join } from 'path';
import * as fs from 'fs';
import { setContext } from 'context';
import * as stylelint from 'stylelint';
import { Programs } from '../src/programs';

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
  setContext({
    workDir: '/tmp/workdir',
    shouldUseTypeScriptParserForJS: true,
    sonarlint: false,
  });

  it('should report issue running eslint', async () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'no-duplicate-string', configurations: ['2'], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues } = await analyzeJavaScript({
      program: createProgram(),
      filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it('should analyze test files', async () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [], fileTypeTarget: ['TEST'] },
      { key: 'no-duplicate-string', configurations: ['2'], fileTypeTarget: ['MAIN'] },
    ]);
    const result = await analyzeJavaScript({
      program: createProgram(),
      filePath,
      fileContent: codeToTest,
      fileType: 'TEST',
    });
    expect(result.issues).toHaveLength(1);
    expect(result.issues).toContainEqual(noOneIterationIssue);

    expect(result.cpdTokens).toBeUndefined();
    expect(result.metrics).toStrictEqual({ nosonarLines: [5] });
    expect(result.highlightedSymbols).toHaveLength(3);
    expect(result.highlights).toHaveLength(11);
  });

  it('should analyze both main and test files', async () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [], fileTypeTarget: ['TEST', 'MAIN'] },
      { key: 'no-duplicate-string', configurations: ['2'], fileTypeTarget: ['MAIN'] },
    ]);

    const testFile: JsAnalysisInput = {
      program: createProgram(),
      filePath,
      fileContent: codeToTest,
      fileType: 'TEST',
    };
    let { issues } = await analyzeJavaScript(testFile);
    expect(issues).toHaveLength(1);
    expect(issues).toContainEqual(noOneIterationIssue);

    ({ issues } = await analyzeJavaScript({
      program: createProgram(),
      filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    }));
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noDuplicateStringIssue);
    expect(issues).toContainEqual(noOneIterationIssue);

    ({ issues } = await analyzeJavaScript(testFile));
    expect(issues).toHaveLength(1);
    expect(issues).toContainEqual(noOneIterationIssue);
  });

  it('should not report issue when not receiving corresponding rule-key', async () => {
    initLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues } = await analyzeJavaScript({
      program: createProgram(),
      filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(0);
  });

  it('should report syntax highlights', async () => {
    initLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const { highlights } = await analyzeJavaScript({
      program: createProgram(),
      filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(highlights).toHaveLength(11);
  });

  it('should report cpd tokens', async () => {
    initLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const { cpdTokens } = await analyzeJavaScript({
      program: createProgram(),
      filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(cpdTokens).toHaveLength(42);
  });

  it('should return empty list when parse error', async () => {
    initLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues } = await analyzeJavaScript({
      program: createProgram(),
      filePath,
      fileContent: `if()`,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(0);
  });

  it('should analyze shebang file', async () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'no-duplicate-string', configurations: ['2'], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues } = await analyzeJavaScript({
      program: createProgram(),
      filePath: join(__dirname, 'fixtures/js-project/shebang.lint.js'),
      fileContent: undefined,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it('should handle BOM', async () => {
    const filePath = join(__dirname, './fixtures/js-project/fileWithBom.lint.js');

    initLinter([]);
    const { cpdTokens } = await analyzeJavaScript({
      program: createProgram(),
      filePath,
      fileContent: undefined,
      fileType: 'MAIN',
    });
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

  it('should report exception from TypeScript compiler as parsing error', async () => {
    const filePath = join(__dirname, './fixtures/failing-typescript/sample.lint.js');
    const tsConfig = join(__dirname, './fixtures/failing-typescript/tsconfig.json');
    const codeToTest = fs.readFileSync(filePath, { encoding: 'utf8' });

    initLinter([{ key: 'arguments-order', configurations: [], fileTypeTarget: ['MAIN'] }]);
    const { parsingError } = await analyzeJavaScript({
      program: createProgram(tsConfig),
      filePath: filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    // this test used to handle typescript exception which was fixed in some version prior 4.1
    // as we are not aware of code triggering an exception in 4.1 this test is left just for curiosity
    expect(parsingError).toBeUndefined();
  });
});

describe('#analyzeTypeScript', () => {
  const filePath = join(__dirname, './fixtures/ts-project/sample.lint.ts');
  const tsConfig = join(__dirname, './fixtures/ts-project/tsconfig.json');
  const codeToTest = fs.readFileSync(filePath, { encoding: 'utf8' });

  it('should report issue running eslint', async () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'no-duplicate-string', configurations: ['2'], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues } = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it('should report issue using type-checker', async () => {
    initLinter([
      { key: 'no-unnecessary-type-assertion', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues } = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: filePath,
      fileContent: `let x = 4; x as number;`,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(1);
    expect(issues).toContainEqual(noUnnecessaryTypeAssertionIssue);
  });

  it('should read file content from fs when not provided', async () => {
    initLinter([
      { key: 'no-one-iteration-loop', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'no-duplicate-string', configurations: ['2'], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues } = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: filePath,
      fileContent: undefined,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it('should normalize provided path', async () => {
    initLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    let result = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: __dirname + '/./fixtures/ts-project/sample.lint.ts',
      fileContent: 'true ? 42 : 42',
      fileType: 'MAIN',
    });
    expect(result.issues).toHaveLength(1);

    initLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    result = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: __dirname + '/././fixtures/ts-project/sample.lint.ts',
      fileContent: 'true ? 42 : 24',
      fileType: 'MAIN',
    });
    // fileContent doesn't have the issue anymore, without path normalization we receive the AST from the first request
    expect(result.issues).toHaveLength(0);
  });

  it('should report syntax highlights', async () => {
    initLinter([]);
    const { highlights } = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(highlights).toHaveLength(10);
  });

  it('should report symbol highlighting', async () => {
    initLinter([]);
    const { highlightedSymbols } = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(highlightedSymbols).toHaveLength(3);
  });

  it('should report cpd tokens', async () => {
    initLinter([]);
    const { cpdTokens } = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(cpdTokens).toHaveLength(42);
  });

  it('should report cognitive complexity', async () => {
    initLinter([]);
    const {
      metrics: { cognitiveComplexity },
    } = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(cognitiveComplexity).toEqual(1);
  });

  it('should not report issue when not receiving corresponding rule-key', async () => {
    initLinter([]);
    const { issues } = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath: filePath,
      fileContent: codeToTest,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(0);
  });

  it('should return empty issues list when parse error', async () => {
    initLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues, parsingError } = await analyzeTypeScript({
      program: createProgram(),
      filePath: filePath,
      fileContent: `if()`,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(0);
    expect(parsingError.line).toBe(1);
    expect(parsingError.message).toBe('Expression expected.');
  });

  it('should analyze JavaScript code in Vue.js file', async () => {
    const filePath = join(__dirname, './fixtures/js-vue-project/sample.lint.vue');
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    initLinter([{ key: 'no-one-iteration-loop', configurations: [], fileTypeTarget: ['MAIN'] }]);
    const { issues } = await analyzeJavaScript({
      program: createProgram(),
      filePath,
      fileContent,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(1);
  });

  it('should analyze TypeScript code in Vue.js file', async () => {
    const filePath = join(__dirname, './fixtures/ts-vue-project/sample.lint.vue');
    const tsConfig = join(__dirname, './fixtures/ts-vue-project/tsconfig.json');
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    initLinter([
      { key: 'no-extra-semi', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'no-return-type-any', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues } = await analyzeTypeScript({
      program: createProgram(tsConfig),
      filePath,
      fileContent,
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(2);
  });
});

jest.mock('stylelint');

describe('#analyzeCss', () => {
  const filePath = join(__dirname, 'fixtures', 'css', 'file.css');
  const request = {
    fileContent: undefined,
    filePath,
    stylelintConfig: join(__dirname, 'fixtures', 'css', 'stylelintconfig.json'),
  };

  const logSpy = jest.fn();

  beforeAll(async () => {
    console.log = logSpy;
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  it('should not return issues for not original file', async () => {
    (stylelint.lint as jest.Mock).mockResolvedValue({
      results: [{ source: 'foo.bar' }],
    });
    const { issues } = await analyzeCss(request);
    expect(issues).toHaveLength(0);
    expect(logSpy).toHaveBeenCalledWith(
      `DEBUG For file [${filePath}] received issues with [foo.bar] as a source. They will not be reported.`,
    );
  });

  it('should throw when failed promise returned', async () => {
    (stylelint.lint as jest.Mock).mockRejectedValue(new Error('some reason'));
    await expect(analyzeCss(request)).rejects.toEqual(new Error('some reason'));
  });
});

function createProgram(tsConfig?: string): string {
  return Programs.getInstance().create(
    tsConfig ?? path.join(__dirname, 'fixtures/js-project/tsconfig.json'),
  ).id;
}
