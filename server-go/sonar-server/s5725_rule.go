package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5725_disabled_resource_integrity"

func init() {
	registeredRule := DecorateRule(
		s5725_disabled_resource_integrity.DisabledResourceIntegrityRule,
		ruleDecoratorsByName[s5725_disabled_resource_integrity.DisabledResourceIntegrityRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S5725"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S5725"
}
