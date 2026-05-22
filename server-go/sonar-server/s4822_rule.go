package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4822_no_try_promise"

func init() {
	registeredRule := DecorateRule(
		s4822_no_try_promise.NoTryPromiseRule,
		ruleDecoratorsByName[s4822_no_try_promise.NoTryPromiseRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S4822"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S4822"
}
