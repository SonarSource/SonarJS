import { analyze } from "../src/analyzer";
import { join } from "path";

const filepath = join(__dirname, "./fixtures/js-project/sample.lint.js");

describe("#analyze", () => {
  it("should report issue running eslint when providing filepath", () => {
    const issues = analyze({
      filepath,
      rules: ["no-all-duplicated-branches"],
    });
    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        column: 1,
        endColumn: 2,
        endLine: 5,
        line: 1,
        message:
          "Remove this conditional structure or edit its code blocks so that they're not all the same.",
        ruleId: "no-all-duplicated-branches",
      },
    ]);
  });

  it("should report issue running eslint when providing fileContent", () => {
    const issues = analyze({
      filepath,
      fileContent: `
        for (var i = 0; i < 10; i++) {
          console.log("i is " + i);
          break;
        }`,
      rules: ["no-one-iteration-loop"],
    });
    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        column: 9,
        endColumn: 12,
        endLine: 2,
        line: 2,
        message: "Refactor this loop to do more than one iteration.",
        ruleId: "no-one-iteration-loop",
      },
    ]);
  });

  it("should not report issue when not receiving corresponding rule-key", () => {
    const issues = analyze({
      filepath,
      fileContent: `
        for (var i = 0; i < 10; i++) {
          console.log("i is " + i);
          break;
        }`,
      rules: ["no-all-duplicated-branches"],
    });
    expect(issues).toHaveLength(0);
  });

  it("should return empty list when parse error", () => {
    const issues = analyze({
      filepath,
      fileContent: `if()`,
      rules: [],
    });
    expect(issues).toHaveLength(0);
  });

  it("should log error when filepath not found", () => {
    console.error = jest.fn();
    const incorrectFilepath = join(__dirname, "./fixtures/js-project/other.lint.js");
    const issues = analyze({
      filepath: incorrectFilepath,
      rules: ["no-all-duplicated-branches"],
    });
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `Failed to find a source file matching path ${incorrectFilepath}`,
    );
    expect(issues).toHaveLength(0);
    jest.resetAllMocks();
  });
});
