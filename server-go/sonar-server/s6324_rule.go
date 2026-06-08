package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6324_no_control_regex"

var _ = registerS6324Rule()

func registerS6324Rule() struct{} {
	registerTypeServiceBatchRule("S6324", s6324_no_control_regex.NoControlRegexRule)
	return struct{}{}
}
