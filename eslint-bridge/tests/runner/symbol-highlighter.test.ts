import getHighlighting, { Highlight, SonarTypeOfText } from "../../src/runner/highlighter";
import { parseTypeScriptSourceFile } from "../../src/parser";
import { join } from "path";
import { SourceCode } from "eslint";
import { analyzeTypeScript } from "../../src/analyzer";
import { HighlightedSymbol, Location } from "../../src/runner/symbol-highlighter";

it("should highlight variable references", () => {
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

it("should highlight variable declared with type", () => {
  const result = actual(`let x: number = 42;`);
  expect(result).toHaveLength(1);
  expect(result[0].declaration).toEqual(location(1, 4, 1, 13));
  expect(result[0].references).toHaveLength(0);
});

it("should highlight unused variable", () => {
  const result = actual(`let x;`);
  expect(result).toHaveLength(1);
  expect(result[0].declaration).toEqual(location(1, 4, 1, 5));
  expect(result[0].references).toHaveLength(0);
});

it("should not highlight variable without declaration", () => {
  const result = actual(`foo(x);`);
  expect(result).toHaveLength(0);
});

it("should highlight imported symbol", () => {
  const result = actual(`import { x } from "hello"; \nx();`);
  expect(result).toHaveLength(1);
  expect(result[0].declaration).toEqual(location(1, 9, 1, 10));
  expect(result[0].references).toHaveLength(1);
  expect(result[0].references[0]).toEqual(location(2, 0, 2, 1));
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
  const filePath = join(__dirname, "/../fixtures/ts-project/sample.lint.ts");
  const tsConfig = join(__dirname, "/../fixtures/ts-project/tsconfig.json");
  const result = analyzeTypeScript({
    filePath,
    fileContent: code,
    rules: [],
    tsConfigs: [tsConfig],
  });

  return result.highlightedSymbols;
}
