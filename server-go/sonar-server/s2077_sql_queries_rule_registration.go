package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2077_sql_queries"

var _ = registerS2077TypeServiceRule()

func registerS2077TypeServiceRule() struct{} {
	registerTypeServiceBatchRule("S2077", s2077_sql_queries.SQLQueriesRule)
	return struct{}{}
}
