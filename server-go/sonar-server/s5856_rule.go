package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5856_no_invalid_regexp"

var _ = registerS5856Rule()

func registerS5856Rule() struct{} {
	registerTypeServiceBatchRule("S5856", s5856_no_invalid_regexp.NoInvalidRegexpRule)
	return struct{}{}
}
