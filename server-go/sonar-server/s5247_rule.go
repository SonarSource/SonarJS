package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5247_disabled_auto_escaping"

func init() {
	registeredRule := DecorateRule(
		s5247_disabled_auto_escaping.DisabledAutoEscapingRule,
		ruleDecoratorsByName[s5247_disabled_auto_escaping.DisabledAutoEscapingRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S5247"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S5247"
}
