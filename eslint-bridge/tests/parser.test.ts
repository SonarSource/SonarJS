import {
  parse,
  ParseException,
  PARSER_CONFIG_MODULE,
  PARSER_CONFIG_SCRIPT,
  parseJavaScriptSourceFile,
  parseTypeScriptSourceFile,
  loggerFn,
} from "../src/parser";
import * as espree from "espree";
import { SourceCode } from "eslint";
import { ParsingError } from "../src/analyzer";

describe("parseJavaScriptSourceFile", () => {
  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should parse jsx", () => {
    expectToParse("const foo = <div>bar</div>;");
  });

  it("should parse flow when with @flow", () => {
    expectToParse("/* @flow */ const foo: string = 'hello';");
    expectToParse("/* @flow */ var eval = 42");
    // even without @flow annotation
    expectToParse("const foo: string = 'hello';");
  });

  it("should parse as script (non-strict mode)", () => {
    expectToParseInNonStrictMode(`var eval = 42`, `Binding eval in strict mode`);
    expectToParseInNonStrictMode(`eval = 42`, `Assigning to eval in strict mode`);
    expectToParseInNonStrictMode(
      `function foo() {}\n var foo = 42;`,
      `Identifier 'foo' has already been declared`,
    );

    expectToParseInNonStrictMode(`x = 043;`, `Invalid number`);
    expectToParseInNonStrictMode(`'\\033'`, `Octal literal in strict mode`);
    expectToParseInNonStrictMode(`with (a) {}`, `'with' in strict mode`);
    expectToParseInNonStrictMode(`public = 42`, `The keyword 'public' is reserved`);
    expectToParseInNonStrictMode(`function foo(a, a) {}`, `Argument name clash`);
    expectToParseInNonStrictMode(`delete x`, `Deleting local variable in strict mode`);
  });

  it("should parse recent javascript syntax", () => {
    let sourceCode;
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
       export class A{}`,
    );
  });

  it("should parse next javascript syntax", () => {
    let sourceCode;
    // ES2019
    sourceCode = parseJavaScriptSourceFile(`try {} catch {}`);
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);
    // next
    // class fields
    expectToParse(`class A {
       static a = 1; 
       b = 2 
    }`);
    // private fields are not supported
    expectToNotParse(
      `class A { static #x = 2
        #privateMethod() { this.#privateField = 42; }
        #privateField = 42
        set #x(value) {}  }`,
      "Unexpected character '#'",
    );
  });

  it("should parse typescript syntax", () => {
    const file = __dirname + "/fixtures/ts-project/sample.lint.ts";
    const sourceCode = parseTypeScriptSourceFile(
      `if (b == 0) { // Noncompliant  
      doOneMoreThing();
    } else {
      doOneMoreThing();
    }
    `,
      file,
      [__dirname + "/fixtures/ts-project/tsconfig.json"],
    ) as SourceCode;
    expect(sourceCode.ast).toBeDefined();
    expect(sourceCode.parserServices.program).toBeDefined();
    const program = sourceCode.parserServices.program;
    expect(program.getTypeChecker()).toBeDefined();
  });

  it("should log parse error with typescript", () => {
    const file = __dirname + "/fixtures/ts-project/sample.error.lint.ts";
    const parsingError = parseTypeScriptSourceFile(`if (b == 0) {`, file, []) as ParsingError;
    expect(parsingError).toBeDefined();
    expect(parsingError.line).toEqual(1);
    expect(parsingError.message).toEqual("'}' expected.");
  });

  it("should return ParsingError with undefined line when file is not part of typescript project", () => {
    const file = __dirname + "/fixtures/ts-project/excluded.ts";
    const parsingError = parseTypeScriptSourceFile(`if (b == 0) {}`, file, [
      __dirname + "/fixtures/ts-project/tsconfig.json",
    ]) as ParsingError;
    expect(parsingError).toBeDefined();
    expect(parsingError.line).toBeUndefined();
    expect(parsingError.message).toEqual(
      `If \"parserOptions.project\" has been set for @typescript-eslint/parser, ${file} must be included in at least one of the projects provided.`,
    );
  });

  it("should return ParsingError when parse errors", () => {
    expectToNotParse("if()", "Unexpected token )");
    expectToNotParse("/* @flow */ if()", "Unexpected token (1:15)");
  });

  it("should log nicely warning about bad TypeScript version", () => {
    console.log = jest.fn();

    loggerFn("Just message");
    loggerFn(
      "WARNING: You are currently running a version of TypeScript which is not officially supported by typescript-estree.",
    );
    loggerFn(
      `WARNING: You are currently running a version of TypeScript which is not officially supported by typescript-estree.
      YOUR TYPESCRIPT VERSION: 1.2.3
      `,
    );

    expect(console.log).toHaveBeenNthCalledWith(1, "Just message");
    expect(console.log).toHaveBeenNthCalledWith(
      2,
      "WARN You are using version of TypeScript  which is not officially supported; supported versions >=3.2.1 <3.6.0",
    );
    expect(console.log).toHaveBeenNthCalledWith(
      3,
      "WARN You are using version of TypeScript 1.2.3 which is not officially supported; supported versions >=3.2.1 <3.6.0",
    );

    jest.resetAllMocks();
  });
});

function expectToParse(code: string) {
  const sourceCode = parseJavaScriptSourceFile(code) as SourceCode;
  expect(sourceCode).toBeDefined();
  expect(sourceCode.ast.body.length).toBeGreaterThan(0);
  expect(console.error).toBeCalledTimes(0);
}

function expectToNotParse(code: string, message: string) {
  const parsingError = parseJavaScriptSourceFile(code) as ParsingError;
  expect(parsingError).toBeDefined();
  expect(parsingError.line).toEqual(1);
  expect(parsingError.message).toEqual(message);
}

function expectToParseInNonStrictMode(code: string, msgInStrictMode: string) {
  const result1 = parse(espree.parse, PARSER_CONFIG_MODULE, code);
  expect((result1 as ParseException).message).toEqual(msgInStrictMode);

  const result2 = parse(espree.parse, PARSER_CONFIG_SCRIPT, code);
  expect((result2 as SourceCode).ast.body.length).toBeGreaterThan(0);
}
