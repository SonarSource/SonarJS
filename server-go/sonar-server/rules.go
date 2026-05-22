package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/adjacent_overload_signatures"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/await_thenable"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/consistent_type_assertions"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_array_method_this_argument"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_base_to_string"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_confusing_non_null_assertion"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_debugger"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_duplicate_enum_values"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_explicit_any"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_inferrable_types"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_instanceof_builtins"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_misused_new"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_misused_promises"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_mixed_enums"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_negation_in_equality_check"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_new_func"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_non_null_assertion"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_object_as_default_parameter"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_redundant_type_constituents"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_setter_return"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_ternary"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_this_assignment"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_typeof_undefined"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unnecessary_type_arguments"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unnecessary_type_assertion"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unnecessary_type_constraint"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_as_const"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_nullish_coalescing"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_optional_chain"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_promise_reject_errors"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_readonly"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_return_this_type"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_string_starts_ends_with"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/radix"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/switch_exhaustiveness_check"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/valid_typeof"
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
	no_non_null_assertion.NoNonNullAssertionRule,
	no_misused_new.NoMisusedNewRule,
	adjacent_overload_signatures.AdjacentOverloadSignaturesRule,
	no_explicit_any.NoExplicitAnyRule,
	no_confusing_non_null_assertion.NoConfusingNonNullAssertionRule,
	no_duplicate_enum_values.NoDuplicateEnumValuesRule,
	no_inferrable_types.NoInferrableTypesRule,
	no_instanceof_builtins.NoInstanceofBuiltinsRule,
	prefer_readonly.PreferReadonlyRule,
	no_unnecessary_type_arguments.NoUnnecessaryTypeArgumentsRule,
	no_unnecessary_type_assertion.NoUnnecessaryTypeAssertionRule,
	no_unnecessary_type_constraint.NoUnnecessaryTypeConstraintRule,
	prefer_return_this_type.PreferReturnThisTypeRule,
	no_mixed_enums.NoMixedEnumsRule,
	prefer_as_const.PreferAsConstRule,
	no_redundant_type_constituents.NoRedundantTypeConstituentsRule,
	no_base_to_string.NoBaseToStringRule,
	no_array_method_this_argument.NoArrayMethodThisArgumentRule,
	no_debugger.NoDebuggerRule,
	no_negation_in_equality_check.NoNegationInEqualityCheckRule,
	no_new_func.NoNewFuncRule,
	no_object_as_default_parameter.NoObjectAsDefaultParameterRule,
	no_setter_return.NoSetterReturnRule,
	no_ternary.NoTernaryRule,
	no_this_assignment.NoThisAssignmentRule,
	no_typeof_undefined.NoTypeofUndefinedRule,
	no_misused_promises.NoMisusedPromisesRule,
	prefer_string_starts_ends_with.PreferStringStartsEndsWithRule,
	prefer_optional_chain.PreferOptionalChainRule,
	prefer_nullish_coalescing.PreferNullishCoalescingRule,
	prefer_promise_reject_errors.PreferPromiseRejectErrorsRule,
	radix.RadixRule,
	switch_exhaustiveness_check.SwitchExhaustivenessCheckRule,
	valid_typeof.ValidTypeofRule,
	NoAsyncPromiseExecutorRule,
	NoArrayDeleteRule,
})

var jstsGoRuleNameBySonarKey = map[string]string{
	"S131":  "switch-exhaustiveness-check",
	"S1525": "no-debugger",
	"S1774": "no-ternary",
	"S2427": "radix",
	"S2432": "no-setter-return",
	"S2870": "no-array-delete",
	"S2933": "prefer-readonly",
	"S2966": "no-non-null-assertion",
	"S3257": "no-inferrable-types",
	"S3523": "no-new-func",
	"S4123": "await-thenable",
	"S4124": "no-misused-new",
	"S4125": "valid-typeof",
	"S4136": "adjacent-overload-signatures",
	"S4137": "consistent-type-assertions",
	"S4157": "no-unnecessary-type-arguments",
	"S4204": "no-explicit-any",
	"S4325": "no-unnecessary-type-assertion",
	"S6544": "no-misused-promises",
	"S6551": "no-base-to-string",
	"S6557": "prefer-string-starts-ends-with",
	"S6565": "prefer-return-this-type",
	"S6568": "no-confusing-non-null-assertion",
	"S6569": "no-unnecessary-type-constraint",
	"S6571": "no-redundant-type-constituents",
	"S6578": "no-duplicate-enum-values",
	"S6582": "prefer-optional-chain",
	"S6583": "no-mixed-enums",
	"S6590": "prefer-as-const",
	"S6606": "prefer-nullish-coalescing",
	"S6671": "prefer-promise-reject-errors",
	"S7729": "no-array-method-this-argument",
	"S7732": "no-instanceof-builtins",
	"S7736": "no-negation-in-equality-check",
	"S7737": "no-object-as-default-parameter",
	"S7740": "no-this-assignment",
	"S7741": "no-typeof-undefined",
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
