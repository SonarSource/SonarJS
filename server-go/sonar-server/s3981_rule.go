package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3981_no_collection_size_mischeck"

func init() {
	registeredRule := DecorateRule(
		s3981_no_collection_size_mischeck.NoCollectionSizeMischeckRule,
		ruleDecoratorsByName[s3981_no_collection_size_mischeck.NoCollectionSizeMischeckRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S3981"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S3981"
}
