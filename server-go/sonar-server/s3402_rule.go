package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3402_no_incorrect_string_concat"

func init() {
	registeredRule := DecorateRule(
		s3402_no_incorrect_string_concat.NoIncorrectStringConcatRule,
		ruleDecoratorsByName[s3402_no_incorrect_string_concat.NoIncorrectStringConcatRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S3402"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S3402"
}
