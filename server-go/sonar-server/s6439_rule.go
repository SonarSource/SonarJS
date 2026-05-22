package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6439_jsx_no_leaked_render"

var _ = registerS6439Rule()

func registerS6439Rule() struct{} {
	registerTypeServiceBatchRule("S6439", s6439_jsx_no_leaked_render.JSXNoLeakedRenderRule)
	return struct{}{}
}
