import { getRuleConfig, decodeSecondaryLocations } from "../src/linter";
import { Rule } from "eslint";

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
      key: "regularRule",
      configurations: ["someOtherOption"],
    });
    expect(config).toEqual(["someOtherOption", "sonar-runtime"]);
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

  const issueWithSecondary = {
    column: 1,
    line: 1,
    ruleId: "ruleUsingSecondaryLocations",
    message: JSON.stringify(encodedMessage),
    secondaryLocations: [],
  };

  it("should not alter message coming from regular rule", () => {
    const { message } = decodeSecondaryLocations(regularRule, issue);
    expect(message).toEqual(issue.message);
  });

  it("should decode message containing secondary location", () => {
    const decodedIssue = decodeSecondaryLocations(ruleUsingSecondaryLocations, issueWithSecondary);
    expect(decodedIssue.secondaryLocations).toEqual(encodedMessage.secondaryLocations);
    expect(decodedIssue.cost).toEqual(encodedMessage.cost);
  });

  it("should log error when cannot parse secondary locations", () => {
    console.error = jest.fn();
    const decodedIssue = decodeSecondaryLocations(ruleUsingSecondaryLocations, {
      ...issueWithSecondary,
      message: "Incorrect message",
    });
    expect(decodedIssue).toBe(null);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to parse issue message containing secondary locations for rule ruleUsingSecondaryLocations",
      new SyntaxError("Unexpected token I in JSON at position 0"),
    );
    jest.resetAllMocks();
  });
});
