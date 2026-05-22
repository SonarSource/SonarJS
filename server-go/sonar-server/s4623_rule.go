package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4623_no_undefined_argument"

func init() {
	registeredRule := DecorateRule(
		s4623_no_undefined_argument.NoUndefinedArgumentRule,
		ruleDecoratorsByName[s4623_no_undefined_argument.NoUndefinedArgumentRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S4623"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S4623"
}
