module github.com/SonarSource/SonarJS/server-go/sonar-server

go 1.26

require (
	github.com/microsoft/typescript-go/shim/ast v0.0.0
	github.com/microsoft/typescript-go/shim/bundled v0.0.0
	github.com/microsoft/typescript-go/shim/checker v0.0.0
	github.com/microsoft/typescript-go/shim/compiler v0.0.0
	github.com/microsoft/typescript-go/shim/core v0.0.0
	github.com/microsoft/typescript-go/shim/jsnum v0.0.0
	github.com/microsoft/typescript-go/shim/parser v0.0.0
	github.com/microsoft/typescript-go/shim/project v0.0.0
	github.com/microsoft/typescript-go/shim/scanner v0.0.0
	github.com/microsoft/typescript-go/shim/tsoptions v0.0.0
	github.com/microsoft/typescript-go/shim/tspath v0.0.0
	github.com/microsoft/typescript-go/shim/vfs v0.0.0
	github.com/microsoft/typescript-go/shim/vfs/cachedvfs v0.0.0
	github.com/microsoft/typescript-go/shim/vfs/osvfs v0.0.0
	gopkg.in/yaml.v3 v3.0.1
	google.golang.org/grpc v1.72.0
	google.golang.org/protobuf v1.36.6
)

replace github.com/microsoft/typescript-go/shim/ast => ../shim/ast

replace github.com/microsoft/typescript-go/shim/bundled => ../shim/bundled

replace github.com/microsoft/typescript-go/shim/checker => ../shim/checker

replace github.com/microsoft/typescript-go/shim/compiler => ../shim/compiler

replace github.com/microsoft/typescript-go/shim/core => ../shim/core

replace github.com/microsoft/typescript-go/shim/jsnum => ../shim/jsnum

replace github.com/microsoft/typescript-go/shim/parser => ../shim/parser

replace github.com/microsoft/typescript-go/shim/project => ../shim/project

replace github.com/microsoft/typescript-go/shim/scanner => ../shim/scanner

replace github.com/microsoft/typescript-go/shim/tsoptions => ../shim/tsoptions

replace github.com/microsoft/typescript-go/shim/tspath => ../shim/tspath

replace github.com/microsoft/typescript-go/shim/vfs => ../shim/vfs

replace github.com/microsoft/typescript-go/shim/vfs/cachedvfs => ../shim/vfs/cachedvfs

replace github.com/microsoft/typescript-go/shim/vfs/osvfs => ../shim/vfs/osvfs
