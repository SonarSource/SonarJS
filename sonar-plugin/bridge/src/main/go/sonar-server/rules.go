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
// For the PoC, only the 7 pure-external rules are included.
var allRules = []rule.Rule{
	await_thenable.AwaitThenableRule,
	prefer_readonly.PreferReadonlyRule,
	no_unnecessary_type_arguments.NoUnnecessaryTypeArgumentsRule,
	no_unnecessary_type_assertion.NoUnnecessaryTypeAssertionRule,
	prefer_return_this_type.PreferReturnThisTypeRule,
	no_mixed_enums.NoMixedEnumsRule,
	prefer_promise_reject_errors.PreferPromiseRejectErrorsRule,
}
