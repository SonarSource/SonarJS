import getHighlighting, { Highlight, SonarTypeOfText } from "../../src/runner/highlighter";
import { parseTypeScriptSourceFile } from "../../src/parser";
import { join } from "path";

it("should highlight keywords", () => {
  const result = actual(
    `class A {
     get b() {
       return this.a;
     }
     static foo() {
       if (cond);
     }
     a: string;
  }`,
  );
  expect(result).toContainEqual(token(1, 0, 1, 5, "keyword")); // class
  expect(result).toContainEqual(token(3, 7, 3, 13, "keyword")); // return
  expect(result).toContainEqual(token(3, 14, 3, 18, "keyword")); // this
  expect(result).toContainEqual(token(5, 5, 5, 11, "keyword")); // static
  expect(result).toContainEqual(token(6, 7, 6, 9, "keyword")); // if
});

it("should highlight comments", () => {
  const result = actual(
    `a // comment1
  /*comment2*/
  // comment3
  b // comment4
  /**
   * comment5
   */
  c
  // comment6`,
  );
  expect(result.length).toBe(6);
  expect(result).toContainEqual(token(1, 2, 1, 13, "comment")); // 1
  expect(result).toContainEqual(token(2, 2, 2, 14, "comment")); // 2
  expect(result).toContainEqual(token(3, 2, 3, 13, "comment")); // 3
  expect(result).toContainEqual(token(4, 4, 4, 15, "comment")); // 4
  expect(result).toContainEqual(token(5, 2, 7, 5, "structured_comment")); // 5
  expect(result).toContainEqual(token(9, 2, 9, 13, "comment")); // 6
});

it("should highlight strings", () => {
  expect(actual("'str'")).toContainEqual(token(1, 0, 1, 5, "string"));
  expect(actual('"str"')).toContainEqual(token(1, 0, 1, 5, "string"));

  expect(actual("`str`")).toContainEqual(token(1, 0, 1, 5, "string"));
  expect(actual("`line1\nline2`")).toContainEqual(token(1, 0, 2, 6, "string"));

  expect(actual("`start ${x} middle ${y} end`")).toContainEqual(token(1, 0, 1, 9, "string"));
  expect(actual("`start ${x} middle ${y} end`")).toContainEqual(token(1, 10, 1, 21, "string"));
  expect(actual("`start ${x} middle ${y} end`")).toContainEqual(token(1, 22, 1, 28, "string"));
});

it("should highlight numbers", () => {
  expect(actual("0")).toContainEqual(token(1, 0, 1, 1, "constant"));
  expect(actual("0.0")).toContainEqual(token(1, 0, 1, 3, "constant"));
  expect(actual("-0.0")).toContainEqual(token(1, 1, 1, 4, "constant"));
  expect(actual("10e-2")).toContainEqual(token(1, 0, 1, 5, "constant"));
});

function token(
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
  textType: SonarTypeOfText,
): Highlight {
  return {
    startLine,
    startCol,
    endLine,
    endCol,
    textType,
  };
}

function actual(code: string): Highlight[] {
  const fileUri = join(__dirname, "/../fixtures/ts-project/sample.lint.ts");
  const tsConfig = join(__dirname, "/../fixtures/ts-project/tsconfig.json");
  const sourceCode = parseTypeScriptSourceFile(code, fileUri, [tsConfig]);
  return getHighlighting(sourceCode).highlights;
}
