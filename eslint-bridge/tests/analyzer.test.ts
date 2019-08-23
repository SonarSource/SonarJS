import { analyze, analyzeTypeScript } from "../src/analyzer";
import { join } from "path";

const codeToTest = `
  import foo from "foo";
  for (var i = 0; i < 10; i++) {
    console.log("i is " + i);
    break;
  }
  "Hello, world"; "Hello, world";
  `;
const noOneIterationIssue = {
  line: 3,
  column: 2,
  endLine: 3,
  endColumn: 5,
  message: "Refactor this loop to do more than one iteration.",
  ruleId: "no-one-iteration-loop",
  secondaryLocations: [],
};
const noDuplicateStringIssue = {
  line: 7,
  column: 2,
  endLine: 7,
  endColumn: 16,
  message: "Define a constant instead of duplicating this literal 2 times.",
  ruleId: "no-duplicate-string",
  secondaryLocations: [],
};

describe("#analyze", () => {
  const filePath = join(__dirname, "./fixtures/js-project/sample.lint.js");

  it("should report issue running eslint", () => {
    const { issues } = analyze({
      filePath,
      fileContent: codeToTest,
      rules: [
        { key: "no-one-iteration-loop", configurations: [] },
        { key: "no-duplicate-string", configurations: ["2"] },
      ],
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it("should not report issue when not receiving corresponding rule-key", () => {
    const { issues } = analyze({
      filePath,
      fileContent: codeToTest,
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
    });
    expect(issues).toHaveLength(0);
  });

  it("should return empty list when parse error", () => {
    const { issues } = analyze({
      filePath,
      fileContent: `if()`,
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
    });
    expect(issues).toHaveLength(0);
  });
});

describe("#analyzeTypeScript", () => {
  const filePath = join(__dirname, "./fixtures/ts-project/sample.lint.ts");
  const tsConfig = join(__dirname, "./fixtures/ts-project/tsconfig.json");

  it("should report issue running eslint", () => {
    const { issues } = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      rules: [
        { key: "no-one-iteration-loop", configurations: [] },
        { key: "no-duplicate-string", configurations: ["2"] },
      ],
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it("should not report issue when not receiving corresponding rule-key", () => {
    const { issues } = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      rules: [],
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(0);
  });

  it("should return empty list when parse error", () => {
    const { issues } = analyzeTypeScript({
      filePath: filePath,
      fileContent: `if()`,
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
      tsConfigs: [],
    });
    expect(issues).toHaveLength(0);
  });
});
