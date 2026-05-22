package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2871_no_alphabetical_sort"

func init() {
	registeredRule := DecorateRule(
		s2871_no_alphabetical_sort.NoAlphabeticalSortRule,
		ruleDecoratorsByName[s2871_no_alphabetical_sort.NoAlphabeticalSortRule.Name]...,
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
	jstsGoRuleNameBySonarKey["S2871"] = registeredRule.Name
	sonarRuleKeyByJstsGoRuleName[registeredRule.Name] = "S2871"
}
