package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4043_no_misleading_array_reverse"

func init() {
	registeredRule := DecorateRule(
		s4043_no_misleading_array_reverse.NoMisleadingArrayReverseRule,
		ruleDecoratorsByName[s4043_no_misleading_array_reverse.NoMisleadingArrayReverseRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S4043"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S4043"
}
