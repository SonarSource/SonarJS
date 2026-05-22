package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6019_no_empty_after_reluctant"

var _ = registerS6019Rule()

func registerS6019Rule() struct{} {
	registerTypeServiceBatchRule("S6019", s6019_no_empty_after_reluctant.NoEmptyAfterReluctantRule)
	return struct{}{}
}
