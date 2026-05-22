package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5867_unicode_aware_regex"

var _ = registerS5867Rule()

func registerS5867Rule() struct{} {
	registerTypeServiceBatchRule("S5867", s5867_unicode_aware_regex.UnicodeAwareRegexRule)
	return struct{}{}
}
