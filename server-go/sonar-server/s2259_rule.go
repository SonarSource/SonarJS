package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2259_null_dereference"

func init() {
	registeredRule := DecorateRule(
		s2259_null_dereference.NullDereferenceRule,
		ruleDecoratorsByName[s2259_null_dereference.NullDereferenceRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S2259"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S2259"
}
