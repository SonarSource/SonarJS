package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5842_empty_string_repetition"

var _ = registerS5842Rule()

func registerS5842Rule() struct{} {
	registerTypeServiceBatchRule("S5842", s5842_empty_string_repetition.EmptyStringRepetitionRule)
	return struct{}{}
}
