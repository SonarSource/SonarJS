package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2819_post_message"

func init() {
	registeredRule := DecorateRule(
		s2819_post_message.PostMessageRule,
		ruleDecoratorsByName[s2819_post_message.PostMessageRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S2819"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S2819"
}
