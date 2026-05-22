package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/adjacent_overload_signatures"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/await_thenable"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/consistent_date_clone"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/consistent_empty_array_spread"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/consistent_type_assertions"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_alert"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_array_method_this_argument"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_await_expression_member"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_base_to_string"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_caller"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_case_declarations"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_confusing_non_null_assertion"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_constructor_return"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_continue"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_debugger"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_dupe_args"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_duplicate_enum_values"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_explicit_any"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_inferrable_types"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_instanceof_builtins"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_lone_blocks"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_loss_of_precision"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_misused_new"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_misused_promises"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_mixed_enums"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_multi_str"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_negation_in_equality_check"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_new_func"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_non_null_assertion"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_object_as_default_parameter"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_octal"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_octal_escape"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_proto"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_redundant_type_constituents"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_sequences"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_setter_return"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_sparse_arrays"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_template_curly_in_string"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_ternary"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_this_assignment"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_typeof_undefined"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_undef_init"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unnecessary_type_arguments"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unnecessary_type_assertion"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unnecessary_type_constraint"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unreadable_iife"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_with"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_zero_fractions"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_as_const"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_nullish_coalescing"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_optional_chain"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_promise_reject_errors"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_readonly"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_return_this_type"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_string_starts_ends_with"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_type_error"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/radix"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s1154_useless_string_operation"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s1529_bitwise_and_or_in_condition"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s1874_deprecation"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2692_index_of_compare_to_positive_number"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2817_web_sql_database"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2999_new_operator_misuse"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3003_string_lexicographic_comparison"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3525_class_prototype"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3579_no_associative_arrays"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4139_no_for_in_iterable"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4324_return_any_type"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4619_array_in_misuse"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6594_prefer_regexp_exec"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6959_reduce_initial_value"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s7059_no_async_constructor"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/switch_exhaustiveness_check"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/valid_typeof"
)

// allRules contains the rules available in the sonar-server.
var ruleDecoratorsByName = map[string][]RuleDecorator{
	"no-array-callback-reference":    {NoArrayCallbackReferenceDecorator},
	"no-array-for-each":              {NoArrayForEachDecorator},
	"no-base-to-string":              {NoBaseToStringDecorator},
	"no-misused-promises":            {NoMisusedPromisesDecorator},
	"no-redundant-type-constituents": {NoRedundantTypeConstituentsDecorator},
	"prefer-at":                      {PreferAtDecorator},
	"prefer-nullish-coalescing":      {PreferNullishCoalescingDecorator},
	"prefer-optional-chain":          {PreferOptionalChainDecorator},
	"prefer-single-call":             {PreferSingleCallDecorator},
	"prefer-string-starts-ends-with": {PreferStringStartsEndsWithDecorator},
	"prefer-top-level-await":         {PreferTopLevelAwaitDecorator},
	"switch-exhaustiveness-check":    {SwitchExhaustivenessCheckDecorator},
}

var allRules = decorateRules([]rule.Rule{
	await_thenable.AwaitThenableRule,
	consistent_date_clone.ConsistentDateCloneRule,
	consistent_empty_array_spread.ConsistentEmptyArraySpreadRule,
	consistent_type_assertions.ConsistentTypeAssertionsRule,
	s1874_deprecation.DeprecationRule,
	s2692_index_of_compare_to_positive_number.IndexOfCompareToPositiveNumberRule,
	s2817_web_sql_database.WebSQLDatabaseRule,
	s2999_new_operator_misuse.NewOperatorMisuseRule,
	s3003_string_lexicographic_comparison.StringLexicographicComparisonRule,
	s3525_class_prototype.ClassPrototypeRule,
	s3579_no_associative_arrays.NoAssociativeArraysRule,
	s4139_no_for_in_iterable.NoForInIterableRule,
	s4324_return_any_type.ReturnAnyTypeRule,
	s4619_array_in_misuse.NoInMisuseRule,
	s6594_prefer_regexp_exec.PreferRegexpExecRule,
	s6959_reduce_initial_value.ReduceInitialValueRule,
	s7059_no_async_constructor.NoAsyncConstructorRule,
	s1154_useless_string_operation.UselessStringOperationRule,
	s1529_bitwise_and_or_in_condition.BitwiseAndOrInConditionRule,
	no_alert.NoAlertRule,
	NoArrayCallbackReferenceRule,
	NoArrayForEachRule,
	no_non_null_assertion.NoNonNullAssertionRule,
	no_misused_new.NoMisusedNewRule,
	adjacent_overload_signatures.AdjacentOverloadSignaturesRule,
	no_explicit_any.NoExplicitAnyRule,
	no_confusing_non_null_assertion.NoConfusingNonNullAssertionRule,
	no_duplicate_enum_values.NoDuplicateEnumValuesRule,
	no_inferrable_types.NoInferrableTypesRule,
	no_instanceof_builtins.NoInstanceofBuiltinsRule,
	no_loss_of_precision.NoLossOfPrecisionRule,
	no_multi_str.NoMultiStrRule,
	no_sparse_arrays.NoSparseArraysRule,
	no_undef_init.NoUndefInitRule,
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
	no_caller.NoCallerRule,
	no_case_declarations.NoCaseDeclarationsRule,
	no_constructor_return.NoConstructorReturnRule,
	no_continue.NoContinueRule,
	no_debugger.NoDebuggerRule,
	no_dupe_args.NoDupeArgsRule,
	no_negation_in_equality_check.NoNegationInEqualityCheckRule,
	no_new_func.NoNewFuncRule,
	no_object_as_default_parameter.NoObjectAsDefaultParameterRule,
	no_octal.NoOctalRule,
	no_octal_escape.NoOctalEscapeRule,
	no_proto.NoProtoRule,
	no_lone_blocks.NoLoneBlocksRule,
	no_sequences.NoSequencesRule,
	no_setter_return.NoSetterReturnRule,
	no_ternary.NoTernaryRule,
	no_template_curly_in_string.NoTemplateCurlyInStringRule,
	no_this_assignment.NoThisAssignmentRule,
	no_typeof_undefined.NoTypeofUndefinedRule,
	no_unreadable_iife.NoUnreadableIifeRule,
	no_with.NoWithRule,
	no_zero_fractions.NoZeroFractionsRule,
	no_await_expression_member.NoAwaitExpressionMemberRule,
	no_misused_promises.NoMisusedPromisesRule,
	PreferAtRule,
	prefer_string_starts_ends_with.PreferStringStartsEndsWithRule,
	prefer_optional_chain.PreferOptionalChainRule,
	prefer_nullish_coalescing.PreferNullishCoalescingRule,
	prefer_promise_reject_errors.PreferPromiseRejectErrorsRule,
	PreferSingleCallRule,
	PreferTopLevelAwaitRule,
	prefer_type_error.PreferTypeErrorRule,
	radix.RadixRule,
	switch_exhaustiveness_check.SwitchExhaustivenessCheckRule,
	valid_typeof.ValidTypeofRule,
	NoAsyncPromiseExecutorRule,
	NoArrayDeleteRule,
})

// jstsGoRuleNameBySonarKey is the local Go registry used by direct Go runs,
// JS-1743 parity work, and AST runtime evaluation. Product routing is
// controlled separately by JsTsChecks.JSTS_GO_RULES on the Java side, so this
// map may intentionally keep unrouted AST-only ports. JS-1746 ("migrate
// remaining type-service external and decorated rules") and JS-1747 ("migrate
// remaining type-service original SonarJS rules") are purely about hard
// type-service rules.
var jstsGoRuleNameBySonarKey = map[string]string{
	"S1154": "useless-string-operation",
	"S131":  "switch-exhaustiveness-check",
	"S1529": "bitwise-operators",
	"S1525": "no-debugger",
	"S1874": "deprecation",
	"S1774": "no-ternary",
	"S2427": "radix",
	"S2432": "no-setter-return",
	"S2692": "index-of-compare-to-positive-number",
	"S2817": "web-sql-database",
	"S2870": "no-array-delete",
	"S2933": "prefer-readonly",
	"S2966": "no-non-null-assertion",
	"S2999": "new-operator-misuse",
	"S3003": "strings-comparison",
	"S3257": "no-inferrable-types",
	"S3523": "no-new-func",
	"S3525": "class-prototype",
	"S3579": "no-associative-arrays",
	"S4123": "await-thenable",
	"S4124": "no-misused-new",
	"S4125": "valid-typeof",
	"S4139": "no-for-in-iterable",
	"S4136": "adjacent-overload-signatures",
	"S4137": "consistent-type-assertions",
	"S4140": "no-sparse-arrays",
	"S4157": "no-unnecessary-type-arguments",
	"S4204": "no-explicit-any",
	"S4324": "no-return-type-any",
	"S4325": "no-unnecessary-type-assertion",
	"S4619": "no-in-misuse",
	"S6544": "no-misused-promises",
	"S6551": "no-base-to-string",
	"S6557": "prefer-string-starts-ends-with",
	"S6594": "prefer-regexp-exec",
	"S6565": "prefer-return-this-type",
	"S6568": "no-confusing-non-null-assertion",
	"S6569": "no-unnecessary-type-constraint",
	"S6571": "no-redundant-type-constituents",
	"S6578": "no-duplicate-enum-values",
	"S6582": "prefer-optional-chain",
	"S6583": "no-mixed-enums",
	"S6590": "prefer-as-const",
	"S6606": "prefer-nullish-coalescing",
	"S6635": "no-constructor-return",
	"S6645": "no-undef-init",
	"S6671": "prefer-promise-reject-errors",
	"S6959": "reduce-initial-value",
	"S7059": "no-async-constructor",
	"S2685": "no-caller",
	"S878":  "no-sequences",
	"S909":  "no-continue",
	"S1199": "no-lone-blocks",
	"S1314": "no-octal",
	"S1321": "no-with",
	"S1442": "no-alert",
	"S1516": "no-multi-str",
	"S1536": "no-dupe-args",
	"S3786": "no-template-curly-in-string",
	"S6534": "no-loss-of-precision",
	"S6654": "no-proto",
	"S6657": "no-octal-escape",
	"S6836": "no-case-declarations",
	"S7719": "consistent-date-clone",
	"S7720": "consistent-empty-array-spread",
	"S7727": "no-array-callback-reference",
	"S7728": "no-array-for-each",
	"S7729": "no-array-method-this-argument",
	"S7730": "no-await-expression-member",
	"S7732": "no-instanceof-builtins",
	"S7755": "prefer-at",
	"S7736": "no-negation-in-equality-check",
	"S7737": "no-object-as-default-parameter",
	"S7740": "no-this-assignment",
	"S7741": "no-typeof-undefined",
	"S7743": "no-unreadable-iife",
	"S7748": "no-zero-fractions",
	"S7778": "prefer-single-call",
	"S7785": "prefer-top-level-await",
	"S7786": "prefer-type-error",
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
