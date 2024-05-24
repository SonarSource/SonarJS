const lodash = require('./lodash');
let RuleTester, testValidTemplate, testInvalidTemplate;
RuleTester = {
    describe: (foo, cb) => {
        cb();
    }
}

const test = {

}



run('foo', {}, test)

/**
 * Adds a new rule test to execute.
 * @param {string} ruleName The name of the rule to run.
 * @param {Function} rule The rule to test.
 * @param {Object} test The collection of tests to run.
 * @returns {void}
 */
function run(ruleName, rule, test) {

  const testerConfig = this.testerConfig,
      requiredScenarios = ["valid", "invalid"],
      scenarioErrors = [],
      result = {};

  // ...

  requiredScenarios.forEach(scenarioType => {
    if (lodash.isNil(test[scenarioType])) {
        scenarioErrors.push(`Could not find any ${scenarioType} test scenarios`);
    }
});

if (scenarioErrors.length > 0) {
    return console.error([
        `Test Scenarios for rule ${ruleName} is invalid:`
    ].concat(scenarioErrors).join("\n"));
}

  /*
  * This creates a mocha test suite and pipes all supplied info through
  * one of the templates above.
  */
  RuleTester.describe(ruleName, () => {
    RuleTester.describe("valid", () => {
        test.valid.forEach(valid => {
                RuleTester.it(valid.code || valid, () => {
                    testValidTemplate(ruleName, valid);
                });
        });
    });

    RuleTester.describe("invalid", () => {
        test.invalid.forEach(invalid => {
            RuleTester.it(invalid.code, () => {
                testInvalidTemplate(ruleName, invalid);
            });
        });
    });
  });
}
