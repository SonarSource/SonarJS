import { processRequest } from "../../src/eslint-runner";
import { join } from "path";

describe("#processRequest", () => {
  it("should use sonarjs plugin", async () => {
    const filepath = join(__dirname, "./fixtures/js-project/sample.lint.js");
    const output = await processRequest({
      files: [{ filepath }],
      rules: {
        "no-all-duplicated-branches": "error"
      }
    });
    expect(output[filepath]).toHaveLength(1);
    expect(output[filepath]).toEqual([
      {
        column: 1,
        endColumn: 2,
        endLine: 5,
        line: 1,
        message:
          "Remove this conditional structure or edit its code blocks so that they're not all the same.",
        ruleId: "no-all-duplicated-branches"
      }
    ]);
  });

  it("should report parse errors", async () => {
    const filepath = join(__dirname, "./fixtures/js-project/sample.lint.js");
    const output = await processRequest({
      files: [{ filepath, fileContent: "if()" }],
      rules: {
        "no-all-duplicated-branches": "error"
      }
    });
    expect(output[filepath]).toHaveLength(1);
    expect(output[filepath]).toEqual([
      {
        column: 4,
        line: 1,
        message: "Parse error: Unexpected token )",
        ruleId: null,
        source: null
      }
    ]);
  });
});
