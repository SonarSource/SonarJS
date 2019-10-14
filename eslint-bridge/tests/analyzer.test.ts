import {
  analyzeJavaScript,
  analyzeTypeScript,
  getCognitiveComplexity,
  getHighlightedSymbols,
} from "../src/analyzer";
import { join } from "path";
import * as fs from "fs";

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
  const codeToTest = fs.readFileSync(filePath, { encoding: "utf8" });

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

  it("should analyze shebang file", () => {
    const { issues } = analyzeJavaScript({
      filePath: join(__dirname, "fixtures/js-project/shebang.lint.js"),
      fileContent: undefined,
      rules: [
        { key: "no-one-iteration-loop", configurations: [] },
        { key: "no-duplicate-string", configurations: ["2"] },
      ],
    });
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual(noOneIterationIssue);
    expect(issues).toContainEqual(noDuplicateStringIssue);
  });

  it("should analyze Vue.js file", () => {
    const filePath = join(__dirname, "./fixtures/vue-project/sample.lint.vue");
    const fileContent = fs.readFileSync(filePath, { encoding: "utf8" });
    const { issues } = analyzeJavaScript({
      filePath: filePath,
      fileContent: fileContent,
      rules: [
        { key: "no-one-iteration-loop", configurations: [] },
        { key: "no-duplicate-string", configurations: ["2"] },
      ],
    });
    expect(issues).toHaveLength(2);
  });

  it("should handle BOM", () => {
    const filePath = join(__dirname, "./fixtures/js-project/fileWithBom.lint.js");

    const cpdTokens = analyzeJavaScript({
      filePath,
      fileContent: undefined,
      rules: [],
    }).cpdTokens;
    expect(cpdTokens).toHaveLength(17);
    const firstLineEnd = Math.max(
      ...cpdTokens
        .filter(token => token.location.startLine == 1)
        .map(token => token.location.endCol),
    );
    expect(firstLineEnd).toBe(11);
  });
});

describe("#analyzeTypeScript", () => {
  const filePath = join(__dirname, "./fixtures/ts-project/sample.lint.ts");
  const tsConfig = join(__dirname, "./fixtures/ts-project/tsconfig.json");
  const codeToTest = fs.readFileSync(filePath, { encoding: "utf8" });

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

  it("should read file content from fs when not provided", () => {
    const { issues } = analyzeTypeScript({
      filePath: filePath,
      fileContent: undefined,
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

  it("should normalize provided path", () => {
    let result = analyzeTypeScript({
      filePath: __dirname + "/./fixtures/ts-project/sample.lint.ts",
      fileContent: "true ? 42 : 42",
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
      tsConfigs: [tsConfig],
    });
    expect(result.issues).toHaveLength(1);

    result = analyzeTypeScript({
      filePath: __dirname + "/././fixtures/ts-project/sample.lint.ts",
      fileContent: "true ? 42 : 24",
      rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
      tsConfigs: [tsConfig],
    });
    // fileContent doesn't have the issue anymore, without path normalization we receive the AST from the first request
    expect(result.issues).toHaveLength(0);
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

  it("should report cognitive complexity", () => {
    const cognitiveComplexity = analyzeTypeScript({
      filePath: filePath,
      fileContent: codeToTest,
      rules: [],
      tsConfigs: [tsConfig],
    }).metrics.cognitiveComplexity;
    expect(cognitiveComplexity).toEqual(1);
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

  it("should return 0 for cognitive complexity when issue is not found", () => {
    console.log = jest.fn();
    expect(getCognitiveComplexity([])).toEqual(0);
    expect(console.log).toHaveBeenCalledWith(
      "DEBUG Failed to retrieve cognitive complexity metric from analysis results",
    );
    jest.resetAllMocks();
  });

  it("should return 0 for cognitive complexity when message is not numeric", () => {
    console.log = jest.fn();
    expect(
      getCognitiveComplexity([
        {
          ruleId: "internal-cognitive-complexity",
          message: "nan",
          column: 0,
          line: 0,
          secondaryLocations: [],
        },
      ]),
    ).toEqual(0);
    expect(console.log).toHaveBeenCalledWith(
      "DEBUG Failed to retrieve cognitive complexity metric from analysis results",
    );
    jest.resetAllMocks();
  });
});
