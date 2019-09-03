import { analyzeJavaScript, analyzeTypeScript, getHighlightedSymbols } from "../src/analyzer";
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
const noUnnecessaryTypeAssertionIssue = {
  line: 1,
  column: 11,
  endLine: 1,
  endColumn: 22,
  message: "This assertion is unnecessary since it does not change the type of the expression.",
  ruleId: "no-unnecessary-type-assertion",
  secondaryLocations: [],
};

describe("#analyzeJavaScript", () => {
  const filePath = join(__dirname, "./fixtures/js-project/sample.lint.js");

  it("should report issue running eslint", () => {
    const { issues } = analyzeJavaScript({
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
    const { issues } = analyzeJavaScript({
      filePath,
      fileContent: codeToTest,
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
    });
    expect(issues).toHaveLength(0);
  });

  it("should report syntax highlights", () => {
    const highlights = analyzeJavaScript({
      filePath,
      fileContent: codeToTest,
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
    }).highlights;
    expect(highlights).toHaveLength(10);
  });

  it("should report cpd tokens", () => {
    const cpdTokens = analyzeJavaScript({
      filePath,
      fileContent: codeToTest,
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
    }).cpdTokens;
    expect(cpdTokens).toHaveLength(36);
  });

  it("should return empty list when parse error", () => {
    const { issues } = analyzeJavaScript({
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

  it("should report issue using type-checker", () => {
    const { issues } = analyzeTypeScript({
      filePath: filePath,
      fileContent: `let x = 4; x as number;`,
      rules: [{ key: "no-unnecessary-type-assertion", configurations: [] }],
      tsConfigs: [tsConfig],
    });
    expect(issues).toHaveLength(1);
    expect(issues).toContainEqual(noUnnecessaryTypeAssertionIssue);
  });

  it("should report syntax highlights", () => {
    const highlights = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      rules: [],
      tsConfigs: [tsConfig],
    }).highlights;
    expect(highlights).toHaveLength(10);
  });

  it("should report symbol highlighting", () => {
    const highlightedSymbols = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      rules: [],
      tsConfigs: [tsConfig],
    }).highlightedSymbols;
    expect(highlightedSymbols).toHaveLength(2);
  });

  it("should report cpd tokens", () => {
    const cpdTokens = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      rules: [],
      tsConfigs: [tsConfig],
    }).cpdTokens;
    expect(cpdTokens).toHaveLength(36);
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

  it("should return empty issues list when parse error", () => {
    const { issues, parsingError } = analyzeTypeScript({
      filePath: filePath,
      fileContent: `if()`,
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
      tsConfigs: [],
    });
    expect(issues).toHaveLength(0);
    expect(parsingError.line).toBe(1);
    expect(parsingError.message).toBe("Expression expected.");
  });

  it("should return empty list with highlighted symbols when issue is not found", () => {
    console.log = jest.fn();
    expect(getHighlightedSymbols([])).toHaveLength(0);
    expect(console.log).toHaveBeenCalledWith(
      "DEBUG Failed to retrieve symbol highlighting from analysis results",
    );
    jest.resetAllMocks();
  });
});
