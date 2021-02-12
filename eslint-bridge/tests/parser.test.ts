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
  parse,
  ParseException,
  PARSER_CONFIG_MODULE,
  PARSER_CONFIG_SCRIPT,
  parseJavaScriptSourceFile,
  parseTypeScriptSourceFile,
  parseVueSourceFile,
  ParseExceptionCode,
  parseExceptionCodeOf,
  babelConfig,
} from 'parser';
import * as babel from '@babel/eslint-parser';
import { SourceCode } from 'eslint';
import { ParsingError } from 'analyzer';
import visit from '../src/utils/visitor';
import * as path from 'path';
import * as fs from 'fs';
import { setContext } from 'context';

describe('parseJavaScriptSourceFile', () => {
  beforeEach(() => {
    console.error = jest.fn();
    console.log = jest.fn();
    setContext({ workDir: '', shouldUseTypeScriptParserForJS: true });
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
    expectToParseInNonStrictMode(`var eval = 42`, `Binding 'eval' in strict mode (1:4)`);
    expectToParseInNonStrictMode(`eval = 42`, `Assigning to 'eval' in strict mode (1:0)`);
    expectToParseInNonStrictMode(
      `function foo() {}\n var foo = 42;`,
      `Identifier 'foo' has already been declared (2:5)`,
    );

    expectToParseInNonStrictMode(
      `x = 043;`,
      `Legacy octal literals are not allowed in strict mode (1:4)`,
    );
    expectToParseInNonStrictMode(
      `'\\033'`,
      `The only valid numeric escape in strict mode is '\\0' (1:2)`,
    );
    expectToParseInNonStrictMode(`with (a) {}`, `'with' in strict mode (1:0)`);
    expectToParseInNonStrictMode(`public = 42`, `Unexpected reserved word 'public' (1:0)`);
    expectToParseInNonStrictMode(`function foo(a, a) {}`, `Argument name clash (1:16)`);
    expectToParseInNonStrictMode(`delete x`, `Deleting local variable in strict mode (1:0)`);
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
    setContext({ workDir: '', shouldUseTypeScriptParserForJS: false });
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
  const dirName = __dirname + '/fixtures/vue-project';
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
    const parsedVueJS = parseVueSourceFile(
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

  it('should log parse error with Vue.js', () => {
    const parsingError = parseVueSourceFile(
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

  it('should parse TypeScript syntax', () => {
    const fileContent = `
      <template></template>
      <script lang="ts">
      type alias = string | string[]
      let union: string | null | undefined;
      let assertion = something as number;
      </script>
      <style></style>`;
    const sourceCode = parseVueSourceFile(fileContent, filePath, [tsConfig]);
    expect(sourceCode).toBeDefined();
    expect(sourceCode).toBeInstanceOf(SourceCode);
  });
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
    const sourceCode = parseVueSourceFile(
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

function expectToParseInNonStrictMode(code: string, msgInStrictMode: string) {
  const result1 = parse(babel.parse, babelConfig(PARSER_CONFIG_MODULE), code);
  expect((result1 as ParseException).message).toContain(msgInStrictMode);

  const result2 = parse(babel.parse, babelConfig(PARSER_CONFIG_SCRIPT), code);
  expect((result2 as SourceCode).ast.body.length).toBeGreaterThan(0);
}
