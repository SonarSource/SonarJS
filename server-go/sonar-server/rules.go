package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/await_thenable"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/consistent_type_assertions"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_base_to_string"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_misused_promises"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_mixed_enums"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_redundant_type_constituents"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unnecessary_type_arguments"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unnecessary_type_assertion"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_nullish_coalescing"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_optional_chain"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_promise_reject_errors"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_readonly"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_return_this_type"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_string_starts_ends_with"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/switch_exhaustiveness_check"
)

// allRules contains the rules available in the sonar-server.
var ruleDecoratorsByName = map[string][]RuleDecorator{
	"no-base-to-string":              {NoBaseToStringDecorator},
	"no-misused-promises":            {NoMisusedPromisesDecorator},
	"no-redundant-type-constituents": {NoRedundantTypeConstituentsDecorator},
	"prefer-nullish-coalescing":      {PreferNullishCoalescingDecorator},
	"prefer-optional-chain":          {PreferOptionalChainDecorator},
	"prefer-string-starts-ends-with": {PreferStringStartsEndsWithDecorator},
	"switch-exhaustiveness-check":    {SwitchExhaustivenessCheckDecorator},
}

var allRules = decorateRules([]rule.Rule{
	await_thenable.AwaitThenableRule,
	consistent_type_assertions.ConsistentTypeAssertionsRule,
	prefer_readonly.PreferReadonlyRule,
	no_unnecessary_type_arguments.NoUnnecessaryTypeArgumentsRule,
	no_unnecessary_type_assertion.NoUnnecessaryTypeAssertionRule,
	prefer_return_this_type.PreferReturnThisTypeRule,
	no_mixed_enums.NoMixedEnumsRule,
	no_redundant_type_constituents.NoRedundantTypeConstituentsRule,
	no_base_to_string.NoBaseToStringRule,
	no_misused_promises.NoMisusedPromisesRule,
	prefer_string_starts_ends_with.PreferStringStartsEndsWithRule,
	prefer_optional_chain.PreferOptionalChainRule,
	prefer_nullish_coalescing.PreferNullishCoalescingRule,
	prefer_promise_reject_errors.PreferPromiseRejectErrorsRule,
	switch_exhaustiveness_check.SwitchExhaustivenessCheckRule,
	NoAsyncPromiseExecutorRule,
	NoArrayDeleteRule,
})

var jstsGoRuleNameBySonarKey = map[string]string{
	"S131":  "switch-exhaustiveness-check",
	"S4123": "await-thenable",
	"S4137": "consistent-type-assertions",
	"S2933": "prefer-readonly",
	"S4157": "no-unnecessary-type-arguments",
	"S4325": "no-unnecessary-type-assertion",
	"S6565": "prefer-return-this-type",
	"S6583": "no-mixed-enums",
	"S6571": "no-redundant-type-constituents",
	"S6551": "no-base-to-string",
	"S6557": "prefer-string-starts-ends-with",
	"S6544": "no-misused-promises",
	"S6582": "prefer-optional-chain",
	"S6606": "prefer-nullish-coalescing",
	"S6671": "prefer-promise-reject-errors",
	"S2870": "no-array-delete",
}

var rulesRunnableWithoutProgram = map[string]struct{}{
	"consistent-type-assertions": {},
	"no-async-promise-executor":  {},
}

var sonarRuleKeyByJstsGoRuleName = map[string]string{}
var allRulesByName = map[string]rule.Rule{}

func decorateRules(rules []rule.Rule) []rule.Rule {
	decoratedRules := make([]rule.Rule, 0, len(rules))
	for _, availableRule := range rules {
		decoratedRules = append(decoratedRules, DecorateRule(availableRule, ruleDecoratorsByName[availableRule.Name]...))
	}
	return decoratedRules
}

func init() {
	for _, availableRule := range allRules {
		allRulesByName[availableRule.Name] = availableRule
	}
	for sonarRuleKey, jstsGoRuleName := range jstsGoRuleNameBySonarKey {
		sonarRuleKeyByJstsGoRuleName[jstsGoRuleName] = sonarRuleKey
	}
	sonarRuleKeyByJstsGoRuleName["no-async-promise-executor"] = "S6544"
}

func sonarRuleKeyFor(ruleName string) string {
	if sonarRuleKey, ok := sonarRuleKeyByJstsGoRuleName[ruleName]; ok {
		return sonarRuleKey
	}
	return ruleName
}

func canRunWithoutProgram(ruleName string) bool {
	_, ok := rulesRunnableWithoutProgram[ruleName]
	return ok
}
