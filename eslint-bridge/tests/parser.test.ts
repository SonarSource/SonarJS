import { parseSourceFile } from "../src/parser";

describe("parseSourceFile", () => {
  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should parse jsx", () => {
    const sourceCode = parseSourceFile("const foo = <div>bar</div>;", "foo.js");
    expect(sourceCode.ast).toBeDefined();
    expect(console.error).toBeCalledTimes(0);
  });

  it("should parse recent javascript syntax", () => {
    // ES2019
    let sourceCode = parseSourceFile(
      `try {
          doSomething();
        } catch {}`,
      "foo.js",
    );
    expect(sourceCode.ast).toBeDefined();
    // ES2018
    sourceCode = parseSourceFile(
      `const obj = {foo: 1, bar: 2, baz: 3};
       const {foo, ...rest} = obj;`,
      "foo.js",
    );
    expect(sourceCode.ast).toBeDefined();
    // ES2017
    sourceCode = parseSourceFile(
      `async function f() {
        await readFile();
      }`,
      "foo.js",
    );
    expect(sourceCode.ast).toBeDefined();
    // ES2016
    sourceCode = parseSourceFile(`4**2`, "foo.js");
    expect(sourceCode.ast).toBeDefined();
    // ES2015
    sourceCode = parseSourceFile(`const f = (x, y) => x + y`, "foo.js");
    expect(sourceCode.ast).toBeDefined();
    expect(console.error).toBeCalledTimes(0);
  });

  it("should log when parse errors", () => {
    const sourceCode = parseSourceFile("if()", "foo.js");
    expect(sourceCode).toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `Failed to parse file [foo.js] at line 1 (espree parser): Unexpected token )`,
    );
  });
});
