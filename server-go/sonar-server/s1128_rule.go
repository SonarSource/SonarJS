package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s1128_unused_import"

var _ = registerS1128Rule()

func registerS1128Rule() struct{} {
	registerTypeServiceBatchRule("S1128", s1128_unused_import.UnusedImportRule)
	return struct{}{}
}
