import { getRuleConfig, decodeSonarRuntimeIssue, analyze } from "../src/linter";
import { Rule, SourceCode } from "eslint";
import { SYMBOL_HIGHLIGHTING_RULE, Rule as InputRule } from "../src/analyzer";
import { parse, parseJavaScriptSourceFile } from "../src/parser";

const ruleUsingSecondaryLocations = {
  meta: { schema: { enum: ["sonar-runtime"] } },
  create(context: Rule.RuleContext) {
    return {};
  },
};

const regularRule = {
  create(context: Rule.RuleContext) {
    return {};
  },
};

describe("#getRuleConfig", () => {
  it("should set sonar-runtime when it's defined in the rule schema", () => {
    const config = getRuleConfig(ruleUsingSecondaryLocations, {
      key: "ruleUsingSecondaryLocations",
      configurations: [],
    });
    expect(config).toContain("sonar-runtime");
  });

  it("should not set sonar-runtime when it's not defined in the rule schema", () => {
    const config = getRuleConfig(undefined, {
      key: "regularRule",
      configurations: [],
    });
    expect(config).not.toContain("sonar-runtime");
  });

  it("should always set sonar-runtime as last option", () => {
    const config = getRuleConfig(ruleUsingSecondaryLocations, {
      key: "ruleUsingSecondaryLocations",
      configurations: ["someOtherOption"],
    });
    expect(config).toEqual(["someOtherOption", "sonar-runtime"]);
  });

  it("should log debug when rule module is not found", () => {
    console.log = jest.fn();
    const config = getRuleConfig(undefined, {
      key: "notExistingRuleModule",
      configurations: [],
    });
    expect(console.log).toHaveBeenCalledWith(
      "DEBUG ruleModule not found for rule notExistingRuleModule",
    );
    expect(config).toEqual([]);
    jest.resetAllMocks();
  });
});

describe("#decodeSecondaryLocations", () => {
  const issue = {
    column: 1,
    line: 1,
    ruleId: "ruleUsingSecondaryLocations",
    secondaryLocations: [],
    message: "Issue message",
  };

  const encodedMessage = {
    secondaryLocations: [{ column: 2, line: 2, message: "Secondary" }],
    cost: 14,
    message: "Issue message",
  };

  const issueWithEncodedMessage = {
    column: 1,
    line: 1,
    ruleId: "ruleUsingSecondaryLocations",
    message: JSON.stringify(encodedMessage),
    secondaryLocations: [],
  };

  it("should not alter message coming from regular rule", () => {
    const { message } = decodeSonarRuntimeIssue(regularRule, issue);
    expect(message).toEqual(issue.message);
  });

  it("should decode message coming from rule with sonar-runtime parameter", () => {
    const decodedIssue = decodeSonarRuntimeIssue(
      ruleUsingSecondaryLocations,
      issueWithEncodedMessage,
    );
    expect(decodedIssue.secondaryLocations).toEqual(encodedMessage.secondaryLocations);
    expect(decodedIssue.cost).toEqual(encodedMessage.cost);
  });

  it("should log error when cannot parse secondary locations", () => {
    console.error = jest.fn();
    const decodedIssue = decodeSonarRuntimeIssue(ruleUsingSecondaryLocations, {
      ...issueWithEncodedMessage,
      message: "Incorrect message",
    });
    expect(decodedIssue).toBe(null);
    expect(console.error).toHaveBeenCalledWith(
      `Failed to parse encoded issue message for rule ${issue.ruleId}:\n"Incorrect message"`,
      new SyntaxError("Unexpected token I in JSON at position 0"),
    );
    jest.resetAllMocks();
  });

  it("should compute symbol highlighting when additional rule", () => {
    const sourceCode = parseJavaScriptSourceFile("let x = 42;") as SourceCode;
    const result = analyze(sourceCode, [], "fileUri", SYMBOL_HIGHLIGHTING_RULE).issues;
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toEqual(SYMBOL_HIGHLIGHTING_RULE.ruleId);
    expect(result[0].message).toEqual(
      `[{\"declaration\":{\"startLine\":1,\"startCol\":4,\"endLine\":1,\"endCol\":5},\"references\":[]}]`,
    );
  });

  it("should not compute symbol highlighting when no additional rule", () => {
    const sourceCode = parseJavaScriptSourceFile("let x = 42;") as SourceCode;
    const result = analyze(sourceCode, [], "fileUri").issues;
    expect(result).toHaveLength(0);
  });
});
