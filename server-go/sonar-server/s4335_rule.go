package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4335_no_useless_intersection"

func init() {
	registeredRule := DecorateRule(
		s4335_no_useless_intersection.NoUselessIntersectionRule,
		ruleDecoratorsByName[s4335_no_useless_intersection.NoUselessIntersectionRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S4335"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S4335"
}
