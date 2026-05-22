package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3403_different_types_comparison"

func init() {
	registeredRule := DecorateRule(
		s3403_different_types_comparison.DifferentTypesComparisonRule,
		ruleDecoratorsByName[s3403_different_types_comparison.DifferentTypesComparisonRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S3403"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S3403"
}
