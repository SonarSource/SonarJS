package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4782_no_redundant_optional"

func init() {
	registeredRule := DecorateRule(
		s4782_no_redundant_optional.NoRedundantOptionalRule,
		ruleDecoratorsByName[s4782_no_redundant_optional.NoRedundantOptionalRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S4782"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S4782"
}
