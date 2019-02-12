import { Rule } from "eslint";
import { createLinterConfig } from "../src/linter";

describe("#createLinterConfig", () => {
  const rules = {
    regularRule: {
      create(context: Rule.RuleContext) {
        return {};
      },
    },
    ruleUsingSecondaryLocations: {
      meta: { schema: { enum: ["sonar-runtime"] } },
      create(context: Rule.RuleContext) {
        return {};
      },
    },
  };

  it("should set sonar-runtime when it's defined in the rule schema", () => {
    const config = createLinterConfig(rules, [
      { key: "ruleUsingSecondaryLocations", configurations: [] },
    ]);
    const options = config.rules.ruleUsingSecondaryLocations;
    expect(options).toContain("sonar-runtime");
  });

  it("should not set sonar-runtime when it's not defined in the rule schema", () => {
    const config = createLinterConfig(rules, [{ key: "regularRule", configurations: [] }]);
    const options = config.rules.regularRule;
    expect(options).not.toContain("sonar-runtime");
  });

  it("should always set sonar-runtime as last option", () => {
    const config = createLinterConfig(rules, [
      { key: "ruleUsingSecondaryLocations", configurations: ["someOtherOption"] },
    ]);
    const options = config.rules.ruleUsingSecondaryLocations;
    expect(options).toEqual(["error", "someOtherOption", "sonar-runtime"]);
  });
});
