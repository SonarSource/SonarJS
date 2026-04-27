package main

import (
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/rules/await_thenable"
	"github.com/typescript-eslint/tsgolint/internal/rules/no_mixed_enums"
	"github.com/typescript-eslint/tsgolint/internal/rules/no_unnecessary_type_arguments"
	"github.com/typescript-eslint/tsgolint/internal/rules/no_unnecessary_type_assertion"
	"github.com/typescript-eslint/tsgolint/internal/rules/prefer_promise_reject_errors"
	"github.com/typescript-eslint/tsgolint/internal/rules/prefer_readonly"
	"github.com/typescript-eslint/tsgolint/internal/rules/prefer_return_this_type"
)

// allRules contains the rules available in the sonar-server.
// For the PoC, 7 external rules and 1 custom Sonar rule are included.
var allRules = []rule.Rule{
	await_thenable.AwaitThenableRule,
	prefer_readonly.PreferReadonlyRule,
	no_unnecessary_type_arguments.NoUnnecessaryTypeArgumentsRule,
	no_unnecessary_type_assertion.NoUnnecessaryTypeAssertionRule,
	prefer_return_this_type.PreferReturnThisTypeRule,
	no_mixed_enums.NoMixedEnumsRule,
	prefer_promise_reject_errors.PreferPromiseRejectErrorsRule,
	NoArrayDeleteRule,
}

var tsgolintRuleNameBySonarKey = map[string]string{
	"S4123": "await-thenable",
	"S2933": "prefer-readonly",
	"S4157": "no-unnecessary-type-arguments",
	"S4325": "no-unnecessary-type-assertion",
	"S6565": "prefer-return-this-type",
	"S6583": "no-mixed-enums",
	"S6671": "prefer-promise-reject-errors",
	"S2870": "no-array-delete",
}

var sonarRuleKeyByTsgolintRuleName = map[string]string{}
var allRulesByName = map[string]rule.Rule{}

func init() {
	for _, availableRule := range allRules {
		allRulesByName[availableRule.Name] = availableRule
	}
	for sonarRuleKey, tsgolintRuleName := range tsgolintRuleNameBySonarKey {
		sonarRuleKeyByTsgolintRuleName[tsgolintRuleName] = sonarRuleKey
	}
}

func sonarRuleKeyFor(ruleName string) string {
	if sonarRuleKey, ok := sonarRuleKeyByTsgolintRuleName[ruleName]; ok {
		return sonarRuleKey
	}
	return ruleName
}
