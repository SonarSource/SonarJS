package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6326_no_regex_spaces"

var _ = registerS6326Rule()

func registerS6326Rule() struct{} {
	registerTypeServiceBatchRule("S6326", s6326_no_regex_spaces.NoRegexSpacesRule)
	return struct{}{}
}
