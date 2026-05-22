package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3785_in_operator_type_error"

func init() {
	registeredRule := DecorateRule(
		s3785_in_operator_type_error.InOperatorTypeErrorRule,
		ruleDecoratorsByName[s3785_in_operator_type_error.InOperatorTypeErrorRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S3785"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S3785"
}
