package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s1301_no_small_switch"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s1488_prefer_immediate_return"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2201_no_ignored_return"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2234_arguments_order"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2301_no_selector_parameter"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2639_no_empty_character_class"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3735_void_use"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3757_operation_returning_nan"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3758_values_not_convertible_to_numbers"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3760_non_number_in_arithmetic_expression"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3782_argument_type"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5843_regex_complexity"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5852_slow_regex"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5860_unused_named_groups"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5868_unicode_grapheme_in_class"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5869_duplicate_characters_in_class"
)

var _ = registerTypeServiceBatchRules()

func registerTypeServiceBatchRules() struct{} {
	registerTypeServiceBatchRule("S1301", s1301_no_small_switch.NoSmallSwitchRule)
	registerTypeServiceBatchRule("S1488", s1488_prefer_immediate_return.PreferImmediateReturnRule)
	registerTypeServiceBatchRule("S2201", s2201_no_ignored_return.NoIgnoredReturnRule)
	registerTypeServiceBatchRule("S2234", s2234_arguments_order.ArgumentsOrderRule)
	registerTypeServiceBatchRule("S2301", s2301_no_selector_parameter.NoSelectorParameterRule)
	registerTypeServiceBatchRule("S2639", s2639_no_empty_character_class.NoEmptyCharacterClassRule)
	registerTypeServiceBatchRule("S3735", s3735_void_use.VoidUseRule)
	registerTypeServiceBatchRule("S3757", s3757_operation_returning_nan.OperationReturningNaNRule)
	registerTypeServiceBatchRule("S3758", s3758_values_not_convertible_to_numbers.ValuesNotConvertibleToNumbersRule)
	registerTypeServiceBatchRule("S3760", s3760_non_number_in_arithmetic_expression.NonNumberInArithmeticExpressionRule)
	registerTypeServiceBatchRule("S3782", s3782_argument_type.ArgumentTypeRule)
	registerTypeServiceBatchRule("S5843", s5843_regex_complexity.RegexComplexityRule)
	registerTypeServiceBatchRule("S5852", s5852_slow_regex.SlowRegexRule)
	registerTypeServiceBatchRule("S5860", s5860_unused_named_groups.UnusedNamedGroupsRule)
	registerTypeServiceBatchRule("S5868", s5868_unicode_grapheme_in_class.UnicodeGraphemeInClassRule)
	registerTypeServiceBatchRule("S5869", s5869_duplicate_characters_in_class.DuplicateCharactersInClassRule)
	return struct{}{}
}

func registerTypeServiceBatchRule(sonarKey string, availableRule rule.Rule) {
	allRules = append(allRules, availableRule)
	jstsGoRuleNameBySonarKey[sonarKey] = availableRule.Name
	allRulesByName[availableRule.Name] = availableRule
	sonarRuleKeyByJstsGoRuleName[availableRule.Name] = sonarKey
}
