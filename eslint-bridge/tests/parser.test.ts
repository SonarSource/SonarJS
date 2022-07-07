/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
  buildParsingOptions,
  buildSourceCode,
  buildSourceCodesFromYaml,
  ParseExceptionCode,
  parseExceptionCodeOf,
  parseYaml,
} from 'parser';
import { SourceCode } from 'eslint';
import { ParsingError, ProgramBasedAnalysisInput } from 'analyzer';
import { visit } from '../src/utils';
import * as estree from 'estree';
import * as path from 'path';
import * as fs from 'fs';
import { setContext } from 'context';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from './utils/parser-utils';
import { createProgram } from '../src/programManager';
import { join } from 'path';

describe('parseJavaScriptSourceFile', () => {
  beforeEach(() => {
    console.error = jest.fn();
    console.log = jest.fn();
    setContext({ workDir: '', shouldUseTypeScriptParserForJS: true, sonarlint: false });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should parse jsx', () => {
    expectToParse('const foo = <div>bar</div>;');
  });

  it('should parse decorators', () => {
    expectToParse(`
      @X()
      @Y()
      class C {
        @Z('demo')
        m() {
          //
        }
      }`);
  });

  it('should parse flow when with @flow', () => {
    expectToParse("/* @flow */ const foo: string = 'hello';");
    expectToParse('/* @flow */ var eval = 42');
    // even without @flow annotation
    expectToParse("const foo: string = 'hello';");
  });

  it('should parse as script (non-strict mode)', () => {
    expectToParse(`var eval = 42`);
    expectToParse(`eval = 42`);
    expectToParse(`function foo() {}\n var foo = 42;`);
    expectToParse(`x = 043;`);
    expectToParse(`'\\033'`);
    expectToParse(`with (a) {}`);
    expectToParse(`public = 42`);
    expectToParse(`function foo(a, a) {}`);
    expectToParse(`delete x`);
  });

  it('should parse recent javascript syntax', () => {
    // ES2018
    expectToParse(
      `const obj = {foo: 1, bar: 2, baz: 3};
       const {foo, ...rest} = obj;`,
    );
    // ES2017
    expectToParse(
      `async function f() {
        await readFile();
      }`,
    );
    // ES2016
    expectToParse(`4**2`);
    // ES2015
    expectToParse(`const f = (x, y) => x + y`);

    // Modules
    expectToParse(
      `import * as Foo from "foo";
import { ParseExceptionCode } from '../src/parser';
       export class A{}`,
    );
  });

  it('should parse next javascript syntax', () => {
    let sourceCode;
    // ES2019
    sourceCode = parseJavaScriptSourceFile(`try {} catch {}`, `foo.js`);
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);
    // next
    // class fields
    expectToParse(`class A {
       static a = 1; 
       b = 2 
    }`);
    // private fields are parsable with TypeScript compiler
    expectToParse(
      `class A { static #x = 2
        #privateMethod() { this.#privateField = 42; }
        #privateField = 42
        set #x(value) {}  }`,
    );
  });

  it('should return ParsingError when parse errors', () => {
    expectToNotParse('if()', 'Unexpected token (1:3)');
    expectToNotParse('/* @flow */ if()', 'Unexpected token (1:15)');
  });

  it('should parse JavaScript syntax with TypeScript compiler', () => {
    const dirPath = __dirname + '/fixtures/js-project';
    const filePath = dirPath + '/sample.lint.js';
    const tsConfig = dirPath + '/tsconfig.json';
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    const sourceCode = parseJavaScriptSourceFile(fileContent, filePath, [tsConfig]) as SourceCode;
    expect(sourceCode.ast).toBeDefined();
    expect(sourceCode.parserServices.program).toBeDefined();
    expect(sourceCode.parserServices.program.getTypeChecker()).toBeDefined();
  });

  it('should not parse JavaScript syntax with TypeScript compiler when analysis parameter is set to False', () => {
    const dirPath = __dirname + '/fixtures/js-project';
    const filePath = dirPath + '/sample.lint.js';
    const tsConfig = dirPath + '/tsconfig.json';
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    setContext({ workDir: '', shouldUseTypeScriptParserForJS: false, sonarlint: false });
    const sourceCode = parseJavaScriptSourceFile(fileContent, filePath, [tsConfig]) as SourceCode;
    expect(sourceCode.ast).toBeDefined();
    expect(sourceCode.parserServices.program).toBeUndefined();
  });

  it(`should log error on TypeScript compiler's parsing failure`, () => {
    parseJavaScriptSourceFile('if (true) {', 'foo.js');
    const callsToLogger = (console.log as jest.Mock).mock.calls;
    const message = `DEBUG Failed to parse foo.js with TypeScript compiler: '}' expected.`;
    expect(callsToLogger.filter(args => args[0] === message)).toHaveLength(1);
  });

  it(`should log error on TypeScript compiler's parsing failure for .vue file`, () => {
    parseJavaScriptSourceFile('<script>if (true) {</script>', 'foo.vue');
    const callsToLogger = (console.log as jest.Mock).mock.calls;
    const message = `DEBUG Failed to parse foo.vue with TypeScript compiler: '}' expected.`;
    expect(callsToLogger.filter(args => args[0] === message)).toHaveLength(1);
  });

  it(`should parse experimental class properties with Babel parser`, () => {
    const code = ` class C { #f = 42; #m() {} }`;
    setContext({ workDir: '', shouldUseTypeScriptParserForJS: false, sonarlint: false });
    const sourceCode = buildSourceCode(
      { filePath: '/some/path', fileContent: code, fileType: 'MAIN', tsConfigs: [] },
      'js',
    ) as SourceCode;
    expect(sourceCode.ast).toBeDefined();
  });
});

describe('parseTypeScriptSourceFile', () => {
  beforeEach(() => {
    console.log = jest.fn();
  });

  it('should parse typescript syntax', () => {
    const file = __dirname + '/fixtures/ts-project/sample.lint.ts';
    const sourceCode = parseTypeScriptSourceFile(
      `if (b == 0) { // Noncompliant  
        doOneMoreThing();
      } else {
        doOneMoreThing();
      }
    `,
      file,
      [__dirname + '/fixtures/ts-project/tsconfig.json'],
    ) as SourceCode;
    expect(sourceCode.ast).toBeDefined();
    expect(sourceCode.parserServices.program).toBeDefined();
    const program = sourceCode.parserServices.program;
    expect(program.getTypeChecker()).toBeDefined();
  });

  it('should log parse error with typescript', () => {
    const file = __dirname + '/fixtures/ts-project/sample.error.lint.ts';
    const parsingError = parseTypeScriptSourceFile(`if (b == 0) {`, file, []) as ParsingError;
    expect(parsingError).toBeDefined();
    expect(parsingError.line).toEqual(1);
    expect(parsingError.message).toEqual("'}' expected.");
    expect(parsingError.code).toEqual(ParseExceptionCode.Parsing);
  });

  it('should return ParsingError with undefined line when file is not part of typescript project', () => {
    const file = path.join(path.basename(__dirname), '/fixtures/ts-project/excluded.ts');
    const parsingError = parseTypeScriptSourceFile(`if (b == 0) {}`, file, [
      __dirname + '/fixtures/ts-project/tsconfig.json',
    ]) as ParsingError;
    expect(parsingError).toBeDefined();
    expect(parsingError.line).toBeUndefined();
    expect(parsingError.message).toEqual(
      `\"parserOptions.project\" has been set for @typescript-eslint/parser.\nThe file does not match your project config: ${file}.\nThe file must be included in at least one of the projects provided.`,
    );
  });

  it('should return correct parsing exception code from exception message', () => {
    expect(parseExceptionCodeOf("Cannot find module 'typescript'")).toEqual(
      ParseExceptionCode.MissingTypeScript,
    );
    expect(parseExceptionCodeOf('You are using version of TypeScript')).toEqual(
      ParseExceptionCode.UnsupportedTypeScript,
    );
    expect(parseExceptionCodeOf('Unexpected token )')).toEqual(ParseExceptionCode.Parsing);
    expect(parseExceptionCodeOf('Debug Failure. False expression')).toEqual(
      ParseExceptionCode.FailingTypeScript,
    );
  });
});

describe('parseVueSourceFile', () => {
  const dirName = __dirname + '/fixtures/js-vue-project';
  const filePath = dirName + '/sample.lint.vue';
  const tsConfig = dirName + '/tsconfig.json';

  it('should parse Vue.js syntax', () => {
    const code = `
      module.exports = {
        data: function () {
          return {
            foo: 'bar'
          }
        }
      }`;

    const parsedJS = parseJavaScriptSourceFile(code, 'foo.js') as SourceCode;
    const parsedVueJS = parseJavaScriptSourceFile(
      `
      <template>
        <p>{{foo}}</p>
      </template>
      <script>
        ${code}
      </script>
      <style>
        p { text-align: center; }
      </style>
    `,
      filePath,
      [tsConfig],
    ) as SourceCode;

    const expected = [],
      actual = [];
    visit(parsedJS, node => expected.push(node.type));
    visit(parsedVueJS, node => actual.push(node.type));
    expect(actual).toEqual(expected);
  });

  it('should log parse error with Vue.js for JavaScript', () => {
    const parsingError = parseJavaScriptSourceFile(
      `
    <script>
    module.exports = {
    </script>`,
      filePath,
      [tsConfig],
    ) as ParsingError;
    expect(parsingError).toBeDefined();
    expect(parsingError.line).toEqual(4);
    expect(parsingError.message).toContain('Unexpected token (3:4)');
    expect(parsingError.code).toEqual(ParseExceptionCode.Parsing);
  });

  it('should parse TypeScript syntax in .vue file', () => {
    const dirName = __dirname + '/fixtures/ts-vue-project';
    const filePath = dirName + '/sample.lint.vue';
    const tsConfig = dirName + '/tsconfig.json';
    const fileContent = `
      <template></template>
      <script lang="ts">
      type alias = string | string[]
      let union: string | null | undefined;
      let assertion = something as number;
      </script>
      <style></style>`;
    const sourceCode = parseTypeScriptSourceFile(fileContent, filePath, [tsConfig]);
    expect(sourceCode).toBeDefined();
    expect(sourceCode).toBeInstanceOf(SourceCode);
  });

  it('should log parse error with Vue.js for TypeScript', () => {
    const dirName = __dirname + '/fixtures/ts-vue-project';
    const filePath = dirName + '/sample.lint.vue';
    const tsConfig = dirName + '/tsconfig.json';

    const parsingError = parseTypeScriptSourceFile(
      `
      <script>
      module.exports = {
      </script>`,
      filePath,
      [tsConfig],
    ) as ParsingError;
    expect(parsingError).toBeDefined();
    expect(parsingError.line).toEqual(4);
    expect(parsingError.message).toContain(`'}' expected.`);
    expect(parsingError.code).toEqual(ParseExceptionCode.Parsing);
  });

  it('should not parse .vue with TypeScript compiler when analysis parameter is set to False', () => {
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    setContext({ workDir: '', shouldUseTypeScriptParserForJS: false, sonarlint: false });
    const sourceCode = parseJavaScriptSourceFile(fileContent, filePath, [tsConfig]) as SourceCode;
    expect(sourceCode.ast).toBeDefined();
    expect(sourceCode.parserServices.program).toBeUndefined();
  });
});

it('should parse TS Vue file after regular TS file', () => {
  const dirName = __dirname + '/fixtures/ts-vue-project';
  const tsConfig = dirName + '/tsconfig.json';
  const tsResult = parseTypeScriptSourceFile(``, dirName + '/main.ts', [tsConfig]);
  const vueResult = parseTypeScriptSourceFile(
    `<script lang="ts"></script>`,
    dirName + '/sample.lint.vue',
    [tsConfig],
  );
  expect(tsResult).toBeInstanceOf(SourceCode);
  expect(vueResult).toBeInstanceOf(SourceCode);
});

describe('parse import expression', () => {
  it('should parse js with import expression', () => {
    const sourceCode = parseJavaScriptSourceFile(`import('moduleName');`, `foo.js`) as SourceCode;
    expect(sourceCode.visitorKeys['ImportExpression']).toBeDefined();
  });

  it('should parse Vue.js with import expression', () => {
    const dirName = __dirname + '/fixtures/vue-project';
    const filePath = dirName + '/sample.lint.vue';
    const tsConfig = dirName + '/tsconfig.json';
    const sourceCode = parseJavaScriptSourceFile(
      `
    <script>
    import("moduleName");
    </script>`,
      filePath,
      [tsConfig],
    ) as SourceCode;
    expect(sourceCode).toBeDefined();
    expect(sourceCode).toBeInstanceOf(SourceCode);
    expect(sourceCode.visitorKeys['ImportExpression']).toBeDefined();
  });
});

describe('program based analysis', () => {
  it('should create options with programs', () => {
    const { programId } = createProgram(join(__dirname, './fixtures/ts-project/tsconfig.json'));
    const filePath = join(__dirname, './fixtures/ts-project/sample.lint.ts');
    const analysisInput: ProgramBasedAnalysisInput = {
      programId,
      filePath,
      fileType: 'MAIN',
      fileContent: undefined,
    };
    const parsingOptions = buildParsingOptions(analysisInput);
    expect(parsingOptions.programs).toHaveLength(1);
    expect(parsingOptions.project).toBeUndefined();
  });
});

describe('parse YAML Files', () => {
  const YAML_LAMBDA_FILE_PATH = join(__dirname, './fixtures/yaml/valid-lambda.yaml');
  const YAML_SERVERLESS_FILE_PATH = join(__dirname, './fixtures/yaml/valid-serverless.yaml');
  const INVALID_YAML_FILE_PATH = join(__dirname, './fixtures/yaml/invalid-yaml.yaml');
  const INVALID_JS_IN_YAML_FILE_PATH = join(__dirname, './fixtures/yaml/invalid-js-in-yaml.yaml');
  const PLAIN_FORMAT_FILE_PATH = join(__dirname, './fixtures/yaml/flow-plain.yaml');
  const BLOCK_FOLDED_FORMAT_FILE_PATH = join(__dirname, './fixtures/yaml/block-folded.yaml');
  const BLOCK_LITERAL_FORMAT_FILE_PATH = join(__dirname, './fixtures/yaml/block-literal.yaml');
  it('should parse YAML syntax', () => {
    const parsed = parseYaml(YAML_LAMBDA_FILE_PATH);
    expect(parsed).toBeDefined();
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(
      expect.objectContaining({
        code: `if (foo()) bar(); else bar();`,
        line: 8,
        column: 18,
        offset: 177,
      }),
    );
  });

  it('should build source code from YAML lambda file', () => {
    const sourceCodes = buildSourceCodesFromYaml(YAML_LAMBDA_FILE_PATH);
    expect(sourceCodes).toHaveLength(1);
    expect(sourceCodes[0]).toBeInstanceOf(SourceCode);
    expect(sourceCodes[0].ast.loc.start).toEqual({ line: 8, column: 17 });
  });

  it('should build source code from YAML serverless file', () => {
    const sourceCodes = buildSourceCodesFromYaml(YAML_SERVERLESS_FILE_PATH);
    expect(sourceCodes).toHaveLength(1);
    expect(sourceCodes[0]).toBeInstanceOf(SourceCode);
    expect(sourceCodes[0].ast.loc.start).toEqual({ line: 7, column: 18 });
  });

  it('should handle YAML parsing errors', () => {
    const parsingError = buildSourceCodesFromYaml(INVALID_YAML_FILE_PATH);
    expect(parsingError).toHaveProperty('code', ParseExceptionCode.Parsing);
    expect(parsingError).toHaveProperty('line', 2);
    expect(parsingError).toHaveProperty('message', 'Map keys must be unique');
  });

  it('should throw a parsing error when parsing invalid JS embedded in YAML', () => {
    const parsingError = buildSourceCodesFromYaml(INVALID_JS_IN_YAML_FILE_PATH);
    expect(parsingError).toHaveProperty('code', ParseExceptionCode.Parsing);
    expect(parsingError).toHaveProperty('line', 1);
    expect(parsingError).toHaveProperty('message', 'Unexpected token (1:4)');
  });

  it('should fix plain-based format locations', () => {
    const [{ ast }] = buildSourceCodesFromYaml(PLAIN_FORMAT_FILE_PATH) as SourceCode[];

    const {
      body: [ifStmt],
    } = ast;
    expect(ifStmt.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 7,
          column: 18,
        },
        end: {
          line: 7,
          column: 67,
        },
      }),
    );
    expect(ifStmt.range).toEqual([170, 219]);

    const { alternate } = ifStmt as estree.IfStatement;
    expect(alternate.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 7,
          column: 57,
        },
        end: {
          line: 7,
          column: 67,
        },
      }),
    );
    expect(alternate.range).toEqual([209, 219]);

    const {
      comments: [comment],
    } = ast;
    expect(comment.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 7,
          column: 38,
        },
        end: {
          line: 7,
          column: 49,
        },
      }),
    );
    expect(comment.range).toEqual([190, 201]);

    const elseToken = ast.tokens.find(token => token.value === 'else');
    expect(elseToken.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 7,
          column: 52,
        },
        end: {
          line: 7,
          column: 56,
        },
      }),
    );
    expect(elseToken.range).toEqual([204, 208]);
  });

  it('should fix block-folded-based format locations', () => {
    const [{ ast }] = buildSourceCodesFromYaml(BLOCK_FOLDED_FORMAT_FILE_PATH) as SourceCode[];
    const {
      body: [ifStmt],
    } = ast;
    expect(ifStmt.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 8,
          column: 8,
        },
        end: {
          line: 12,
          column: 9,
        },
      }),
    );
    expect(ifStmt.range).toEqual([180, 265]);

    const { alternate } = ifStmt as estree.IfStatement;
    expect(alternate.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 10,
          column: 15,
        },
        end: {
          line: 12,
          column: 9,
        },
      }),
    );
    expect(alternate.range).toEqual([237, 265]);

    const {
      comments: [comment],
    } = ast;
    expect(comment.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 9,
          column: 17,
        },
        end: {
          line: 9,
          column: 28,
        },
      }),
    );
    expect(comment.range).toEqual([210, 221]);

    const elseToken = ast.tokens.find(token => token.value === 'else');
    expect(elseToken.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 10,
          column: 10,
        },
        end: {
          line: 10,
          column: 14,
        },
      }),
    );
    expect(elseToken.range).toEqual([232, 236]);
  });

  it('should fix block-literal-based format locations', () => {
    const [{ ast }] = buildSourceCodesFromYaml(BLOCK_LITERAL_FORMAT_FILE_PATH) as SourceCode[];
    const {
      body: [ifStmt],
    } = ast;
    expect(ifStmt.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 8,
          column: 8,
        },
        end: {
          line: 12,
          column: 9,
        },
      }),
    );
    expect(ifStmt.range).toEqual([180, 265]);

    const { alternate } = ifStmt as estree.IfStatement;
    expect(alternate.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 10,
          column: 15,
        },
        end: {
          line: 12,
          column: 9,
        },
      }),
    );
    expect(alternate.range).toEqual([237, 265]);

    const {
      comments: [comment],
    } = ast;
    expect(comment.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 9,
          column: 17,
        },
        end: {
          line: 9,
          column: 28,
        },
      }),
    );
    expect(comment.range).toEqual([210, 221]);

    const elseToken = ast.tokens.find(token => token.value === 'else');
    expect(elseToken.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 10,
          column: 10,
        },
        end: {
          line: 10,
          column: 14,
        },
      }),
    );
    expect(elseToken.range).toEqual([232, 236]);
  });
});

function expectToParse(code: string) {
  const sourceCode = parseJavaScriptSourceFile(code, 'foo.js') as SourceCode;
  expect(sourceCode).toBeDefined();
  expect(sourceCode.ast.body.length).toBeGreaterThan(0);
  expect(console.error).toBeCalledTimes(0);
}

function expectToNotParse(code: string, message: string) {
  const parsingError = parseJavaScriptSourceFile(code, 'foo.js') as ParsingError;
  expect(parsingError).toBeDefined();
  expect(parsingError.line).toEqual(1);
  expect(parsingError.message).toContain(message);
}
