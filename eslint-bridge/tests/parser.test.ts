import { parseSourceFile, parseSourceFileAsModule, parseSourceFileAsScript } from "../src/parser";
import * as babel from "babel-eslint";

describe("parseSourceFile", () => {
  beforeEach(() => {
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should not parse when invalid code and log reason", () => {
    expect(parseSourceFile("export { a, a }", "foo.js")).toBeUndefined();
    expect(console.error).toBeCalledWith(
      "Failed to parse file [foo.js] at line 1: `a` has already been exported. Exported identifiers must be unique. (1:12) (with babel-eslint parser in module mode)",
    );
    expect(console.log).toBeCalledWith(
      "DEBUG Failed to parse file [foo.js] at line 1: `a` has already been exported. Exported identifiers must be unique. (1:12) (with babel-eslint parser in script mode)",
    );
  });

  it("should parse jsx", () => {
    const sourceCode = parseSourceFile("const foo = <div>bar</div>;", "foo.js");
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);
    expect(console.error).toBeCalledTimes(0);
  });

  it("should parse flow when with @flow", () => {
    expect(parseSourceFile("/* @flow */ const foo: string = 'hello';", "foo.js")).toBeDefined();
    expect(parseSourceFile("/* @flow */ var eval = 42", "foo.js")).toBeDefined();
  });

  it("should parse scripts (with retry after module)", () => {
    expect(parseSourceFile("var eval = 42", "foo.js").ast).toBeDefined();
    expect(console.error).toBeCalledTimes(0);
  });

  it("should parse as script (non-strict mode)", () => {
    expectToParseInNonStrictMode(`var eval = 42`, `"eval is a reserved word in strict mode (1:4)"`);
    expectToParseInNonStrictMode(`eval = 42`, `"eval is a reserved word in strict mode (1:0)"`);

    // this is not an error in babel,
    // see https://github.com/babel/babel/issues/6722
    // expectToParseInNonStrictMode(
    //   `function foo() {}\n var foo = 42;`,
    //   `"Identifier 'foo' has already been declared"`,
    // );

    expectToParseInNonStrictMode(`x = 043;`, `"Invalid number (1:4)"`);
    expectToParseInNonStrictMode(`'\\033'`, `"Octal literal in strict mode (1:2)"`);
    expectToParseInNonStrictMode(`with (a) {}`, `"'with' in strict mode (1:0)"`);
    expectToParseInNonStrictMode(`public = 42`, `"public is a reserved word in strict mode (1:0)"`);
    expectToParseInNonStrictMode(
      `function foo(a, a) {}`,
      `"Argument name clash in strict mode (1:16)"`,
    );
    expectToParseInNonStrictMode(`delete x`, `"Deleting local variable in strict mode (1:0)"`);

    function expectToParseInNonStrictMode(sourceCode, msgInStrictMode) {
      expect(() =>
        parseSourceFileAsModule(babel.parse, sourceCode),
      ).toThrowErrorMatchingInlineSnapshot(msgInStrictMode);
      expect(parseSourceFileAsScript(babel.parse, sourceCode)).toBeDefined();
    }
  });

  it("should parse recent javascript syntax", () => {
    let sourceCode;
    // stage-0
    sourceCode = parseSourceFile(
      `
        class Foo {
          static prop = 1;
          bar = () => {}
        }
      `,
      "foo.js",
    );
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);

    // ES2018
    sourceCode = parseSourceFile(
      `const obj = {foo: 1, bar: 2, baz: 3};
       const {foo, ...rest} = obj;`,
      "foo.js",
    );
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);
    // ES2017
    sourceCode = parseSourceFile(
      `async function f() {
        await readFile();
      }`,
      "foo.js",
    );
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);
    // ES2016
    sourceCode = parseSourceFile(`4**2`, "foo.js");
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);
    // ES2015
    sourceCode = parseSourceFile(`const f = (x, y) => x + y`, "foo.js");
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);

    // Modules
    sourceCode = parseSourceFile(
      `import * as Foo from "foo";
       export class A{}`,
      "foo.js",
    );
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);

    expect(console.error).toBeCalledTimes(0);
  });

  it("should log when parse errors", () => {
    const sourceCode = parseSourceFile("if()", "foo.js");
    expect(sourceCode).toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `Failed to parse file [foo.js] at line 1: Unexpected token (1:3) (with babel-eslint parser in module mode)`,
    );
  });

  it("should log when parse errors with @flow", () => {
    const sourceCode = parseSourceFile("/* @flow */ if()", "foo.js");
    expect(sourceCode).toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to parse file [foo.js] at line 1: Unexpected token (1:15) (with babel-eslint parser in module mode)",
    );
  });
});
