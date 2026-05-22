package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3533_no_require_or_define"

func init() {
	registeredRule := DecorateRule(
		s3533_no_require_or_define.NoRequireOrDefineRule,
		ruleDecoratorsByName[s3533_no_require_or_define.NoRequireOrDefineRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S3533"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S3533"
}
