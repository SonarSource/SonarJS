package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6328_existing_groups"

var _ = registerS6328Rule()

func registerS6328Rule() struct{} {
	registerTypeServiceBatchRule("S6328", s6328_existing_groups.ExistingGroupsRule)
	return struct{}{}
}
