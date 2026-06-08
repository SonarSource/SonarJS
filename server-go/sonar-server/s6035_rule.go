package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6035_single_character_alternation"

var _ = registerS6035Rule()

func registerS6035Rule() struct{} {
	registerTypeServiceBatchRule("S6035", s6035_single_character_alternation.SingleCharacterAlternationRule)
	return struct{}{}
}
