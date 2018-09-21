import { analyze } from "../../src/analyzer";
import { join } from "path";

describe("#processRequest", () => {
  it("should use sonarjs plugin", () => {
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

  it("should report parse errors", () => {
    const filepath = join(__dirname, "./fixtures/js-project/sample.lint.js");
    const output = analyze({
      filepath,
      fileContent: "if()",
      rules: ["no-all-duplicated-branches"],
    });
    expect(output).toHaveLength(1);
    expect(output).toEqual([
      {
        column: 4,
        line: 1,
        message: "Parse error: Unexpected token )",
        ruleId: null,
        source: null,
      },
    ]);
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
});
