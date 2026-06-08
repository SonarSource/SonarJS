package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5850_anchor_precedence"

var _ = registerS5850Rule()

func registerS5850Rule() struct{} {
	registerTypeServiceBatchRule("S5850", s5850_anchor_precedence.AnchorPrecedenceRule)
	return struct{}{}
}
