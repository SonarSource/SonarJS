package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6331_no_empty_group"

var _ = registerS6331Rule()

func registerS6331Rule() struct{} {
	registerTypeServiceBatchRule("S6331", s6331_no_empty_group.NoEmptyGroupRule)
	return struct{}{}
}
