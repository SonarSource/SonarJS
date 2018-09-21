import { analyze } from "../src/analyzer";
import { join } from "path";

describe("#analyzer.analyze", () => {
  it("should report issue running eslint", () => {
    const filepath = join(__dirname, "./fixtures/js-project/sample.lint.js");
    const reportedIssues = analyze({
      filepath,
      rules: ["no-all-duplicated-branches"],
    });
    expect(reportedIssues).toHaveLength(1);
    expect(reportedIssues).toEqual([
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

  it("should not report issue without receiving rule-key", () => {
    const filepath = join(__dirname, "./fixtures/js-project/sample.lint.js");
    const reportedIssues = analyze({
      filepath,
      rules: [],
    });
    expect(reportedIssues).toHaveLength(0);
  });

  it("should log when parse errors", () => {
    console.error = jest.fn();
    const filepath = join(__dirname, "./fixtures/js-project/sample.lint.js");
    const output = analyze({
      filepath,
      fileContent: "if()",
      rules: [],
    });
    expect(output).toHaveLength(0);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("should parse jsx", () => {
    const filepath = join(__dirname, "./fixtures/js-project/sample.lint.js");
    const output = analyze({
      filepath,
      fileContent: "const foo = <div>bar</div>;",
      rules: ["no-all-duplicated-branches"],
    });
    expect(output).toHaveLength(0);
  });

  it("should parse es2019", () => {
    const filepath = join(__dirname, "./fixtures/js-project/sample.lint.js");
    const output = analyze({
      filepath,
      fileContent: `try {
          doSomething();
        } catch {}`,
      rules: ["no-all-duplicated-branches"],
    });
    expect(output).toHaveLength(0);
  });

  it("should log error when filepath not found", () => {
    console.error = jest.fn();
    const filepath = join(__dirname, "./fixtures/js-project/other.lint.js");
    const output = analyze({
      filepath,
      rules: ["no-all-duplicated-branches"],
    });
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(output).toHaveLength(0);
    jest.resetAllMocks();
  });
});
