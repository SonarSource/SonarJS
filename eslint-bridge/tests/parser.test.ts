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
import { ParseExceptionCode, parseExceptionCodeOf } from 'parser';
import { SourceCode } from 'eslint';
import { ParsingError } from 'analyzer';
import { visit } from '../src/utils';
import * as fs from 'fs';
import { setContext } from 'context';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from './utils/parser-utils';

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
    const sourceCode = parseJavaScriptSourceFile(fileContent, filePath, tsConfig) as SourceCode;
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
    const sourceCode = parseJavaScriptSourceFile(fileContent, filePath, tsConfig) as SourceCode;
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
    const sourceCode = parseJavaScriptSourceFile(code, '/some/path') as SourceCode;
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
      __dirname + '/fixtures/ts-project/tsconfig.json',
    ) as SourceCode;
    expect(sourceCode.ast).toBeDefined();
    expect(sourceCode.parserServices.program).toBeDefined();
    const program = sourceCode.parserServices.program;
    expect(program.getTypeChecker()).toBeDefined();
  });

  it('should log parse error with typescript', () => {
    const file = __dirname + '/fixtures/ts-project/sample.error.lint.ts';
    const parsingError = parseTypeScriptSourceFile(`if (b == 0) {`, file) as ParsingError;
    expect(parsingError).toBeDefined();
    expect(parsingError.line).toEqual(1);
    expect(parsingError.message).toEqual("'}' expected.");
    expect(parsingError.code).toEqual(ParseExceptionCode.Parsing);
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
      tsConfig,
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
      tsConfig,
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
    const sourceCode = parseTypeScriptSourceFile(fileContent, filePath, tsConfig);
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
      tsConfig,
    ) as ParsingError;
    expect(parsingError).toBeDefined();
    expect(parsingError.line).toEqual(4);
    expect(parsingError.message).toContain(`'}' expected.`);
    expect(parsingError.code).toEqual(ParseExceptionCode.Parsing);
  });

  it('should not parse .vue with TypeScript compiler when analysis parameter is set to False', () => {
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    setContext({ workDir: '', shouldUseTypeScriptParserForJS: false, sonarlint: false });
    const sourceCode = parseJavaScriptSourceFile(fileContent, filePath, tsConfig) as SourceCode;
    expect(sourceCode.ast).toBeDefined();
    expect(sourceCode.parserServices.program).toBeUndefined();
  });
});

it('should parse TS Vue file after regular TS file', () => {
  const dirName = __dirname + '/fixtures/ts-vue-project';
  const tsConfig = dirName + '/tsconfig.json';
  const tsResult = parseTypeScriptSourceFile(``, dirName + '/main.ts', tsConfig);
  const vueResult = parseTypeScriptSourceFile(
    `<script lang="ts"></script>`,
    dirName + '/sample.lint.vue',
    tsConfig,
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
    const dirName = __dirname + '/fixtures/js-vue-project';
    const filePath = dirName + '/sample.lint.vue';
    const tsConfig = dirName + '/tsconfig.json';
    const sourceCode = parseJavaScriptSourceFile(
      `
    <script>
    import("moduleName");
    </script>`,
      filePath,
      tsConfig,
    ) as SourceCode;
    expect(sourceCode).toBeDefined();
    expect(sourceCode).toBeInstanceOf(SourceCode);
    expect(sourceCode.visitorKeys['ImportExpression']).toBeDefined();
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
