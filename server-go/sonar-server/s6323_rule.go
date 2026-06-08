package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6323_no_empty_alternatives"

var _ = registerS6323Rule()

func registerS6323Rule() struct{} {
	registerTypeServiceBatchRule("S6323", s6323_no_empty_alternatives.NoEmptyAlternativesRule)
	return struct{}{}
}
