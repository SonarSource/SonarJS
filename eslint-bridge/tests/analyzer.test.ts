import { analyze, analyzeTypeScript } from "../src/analyzer";
import { join } from "path";

describe("#analyze", () => {
  const fileUri = join(__dirname, "./fixtures/js-project/sample.lint.js");

  it("should report issue running eslint", () => {
    const issues = analyze({
      fileUri,
      fileContent: `
        import foo from "foo";
        for (var i = 0; i < 10; i++) {
          console.log("i is " + i);
          break;
        }
        "Hello, world"; "Hello, world";
        `,
      rules: [
        { key: "no-one-iteration-loop", configurations: [] },
        { key: "no-duplicate-string", configurations: ["2"] },
      ],
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({
      line: 3,
      column: 8,
      endLine: 3,
      endColumn: 11,
      message: "Refactor this loop to do more than one iteration.",
      ruleId: "no-one-iteration-loop",
      secondaryLocations: [],
    });
    expect(issues).toContainEqual({
      line: 7,
      column: 8,
      endLine: 7,
      endColumn: 22,
      message: "Define a constant instead of duplicating this literal 2 times.",
      ruleId: "no-duplicate-string",
      secondaryLocations: [],
    });
  });

  it("should not report issue when not receiving corresponding rule-key", () => {
    const issues = analyze({
      fileUri,
      fileContent: `
        for (var i = 0; i < 10; i++) {
          console.log("i is " + i);
          break;
        }`,
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
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

describe("#analyzeTypeScript", () => {
  const fileUri = join(__dirname, "./fixtures/ts-project/sample.lint.ts");
  const tsConfig = join(__dirname, "./fixtures/ts-project/tsconfig.json");

  it("should report issue running eslint", () => {
    const issues = analyzeTypeScript({
      fileUri,
      fileContent: `
        import foo from "foo";
        for (var i = 0; i < 10; i++) {
          console.log("i is " + i);
          break;
        }
        "Hello, world"; "Hello, world";
        `,
      rules: [
        { key: "no-one-iteration-loop", configurations: [] },
        { key: "no-duplicate-string", configurations: ["2"] },
      ],
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({
      line: 3,
      column: 8,
      endLine: 3,
      endColumn: 11,
      message: "Refactor this loop to do more than one iteration.",
      ruleId: "no-one-iteration-loop",
      secondaryLocations: [],
    });
    expect(issues).toContainEqual({
      line: 7,
      column: 8,
      endLine: 7,
      endColumn: 22,
      message: "Define a constant instead of duplicating this literal 2 times.",
      ruleId: "no-duplicate-string",
      secondaryLocations: [],
    });
  });

  it("should not report issue when not receiving corresponding rule-key", () => {
    const issues = analyzeTypeScript({
      fileUri,
      fileContent: `
        for (var i = 0; i < 10; i++) {
          console.log("i is " + i);
          break;
        }`,
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(0);
  });

  it("should return empty list when parse error", () => {
    const issues = analyzeTypeScript({
      fileUri,
      fileContent: `if()`,
      rules: [],
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(0);
  });
});
