import { analyze } from "../src/analyzer";
import { join } from "path";

const fileUri = join(__dirname, "./fixtures/js-project/sample.lint.js");

describe("#analyze", () => {
  it("should report issue running eslint when providing fileContent", () => {
    const issues = analyze({
      fileUri,
      fileContent: `
        import foo from "foo";
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
        endLine: 3,
        line: 3,
        message: "Refactor this loop to do more than one iteration.",
        ruleId: "no-one-iteration-loop",
      },
    ]);
  });

  it("should not report issue when not receiving corresponding rule-key", () => {
    const issues = analyze({
      fileUri,
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
      fileUri,
      fileContent: `if()`,
      rules: [],
    });
    expect(issues).toHaveLength(0);
  });
});
