package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2699_assertions_in_tests"

func init() {
	registeredRule := DecorateRule(
		s2699_assertions_in_tests.AssertionsInTestsRule,
		ruleDecoratorsByName[s2699_assertions_in_tests.AssertionsInTestsRule.Name]...,
	)

	alreadyRegistered := false
	for _, availableRule := range allRules {
		if availableRule.Name == registeredRule.Name {
			alreadyRegistered = true
			break
		}
	}
	if !alreadyRegistered {
		allRules = append(allRules, registeredRule)
	}

	allRulesByName[registeredRule.Name] = registeredRule
	jstsGoRuleNameBySonarKey["S2699"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S2699"
}
