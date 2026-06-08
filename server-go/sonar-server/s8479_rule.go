package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s8479_dompurify_unsafe_config"

func init() {
	registeredRule := DecorateRule(
		s8479_dompurify_unsafe_config.DOMPurifyUnsafeConfigRule,
		ruleDecoratorsByName[s8479_dompurify_unsafe_config.DOMPurifyUnsafeConfigRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S8479"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S8479"
}
