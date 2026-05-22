package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6353_concise_regex"

var _ = registerS6353Rule()

func registerS6353Rule() struct{} {
	registerTypeServiceBatchRule("S6353", s6353_concise_regex.ConciseRegexRule)
	return struct{}{}
}
