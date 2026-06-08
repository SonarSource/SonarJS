package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3800_function_return_type"

func init() {
	registeredRule := DecorateRule(
		s3800_function_return_type.FunctionReturnTypeRule,
		ruleDecoratorsByName[s3800_function_return_type.FunctionReturnTypeRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S3800"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S3800"
}
