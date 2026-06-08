package main

import "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3801_inconsistent_return"

var _ = registerS3801Rule()

func registerS3801Rule() struct{} {
	registerTypeServiceBatchRule("S3801", s3801_inconsistent_return.InconsistentReturnRule)
	return struct{}{}
}
