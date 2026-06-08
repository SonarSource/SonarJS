package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6397_single_char_in_character_classes"

var _ = registerS6397Rule()

func registerS6397Rule() struct{} {
	registerTypeServiceBatchRule("S6397", s6397_single_char_in_character_classes.SingleCharInCharacterClassesRule)
	return struct{}{}
}
