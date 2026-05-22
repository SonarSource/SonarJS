package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3796_array_callback_without_return"

func init() {
	registeredRule := DecorateRule(
		s3796_array_callback_without_return.ArrayCallbackWithoutReturnRule,
		ruleDecoratorsByName[s3796_array_callback_without_return.ArrayCallbackWithoutReturnRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S3796"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S3796"
}
