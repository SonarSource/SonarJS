import { getRuleConfig } from "../src/linter";

describe("#getRuleConfig", () => {
  const ruleUsingSecondaryLocations = {
    schema: { enum: ["sonar-runtime"] },
  };

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
});
