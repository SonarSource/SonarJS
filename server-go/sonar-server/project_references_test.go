package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
)

func TestCreateConfiguredProgramSupportsReferencedTSConfigFilePathsWithoutComposite(t *testing.T) {
	baseDir := tspath.NormalizePath(t.TempDir())
	rootConfigPath := tspath.CombinePaths(baseDir, "tsconfig.json")
	childConfigPath := tspath.CombinePaths(baseDir, "dir/tsconfig.json")
	rootFilePath := tspath.CombinePaths(baseDir, "file.ts")
	childFilePath := tspath.CombinePaths(baseDir, "dir/file.ts")

	writeNormalizedTestFile(t, rootConfigPath, "{\"files\":[\"file.ts\"],\"references\":[{\"path\":\"dir/tsconfig.json\"}]}\n")
	writeNormalizedTestFile(t, childConfigPath, "{\"files\":[\"file.ts\"],\"references\":[{\"path\":\"..\\\\tsconfig.json\"}]}\n")
	writeNormalizedTestFile(t, rootFilePath, "export const root = 1;\n")
	writeNormalizedTestFile(t, childFilePath, "export const child = 1;\n")

	var diags []diagnostic.Internal
	program, err := createConfiguredProgram(
		NormalizedProjectConfiguration{BaseDir: baseDir},
		rootConfigPath,
		"",
		bundled.WrapFS(osvfs.FS()),
		func(d diagnostic.Internal) {
			diags = append(diags, d)
		},
	)
	if err != nil {
		t.Fatalf("expected root configured program creation to succeed, got %v", err)
	}
	if len(diags) > 0 {
		t.Fatalf("expected no root internal diagnostics, got %#v", diags)
	}
	if program == nil {
		t.Fatal("expected root configured program")
	}

	diags = nil
	program, err = createConfiguredProgram(
		NormalizedProjectConfiguration{BaseDir: baseDir},
		childConfigPath,
		"",
		bundled.WrapFS(osvfs.FS()),
		func(d diagnostic.Internal) {
			diags = append(diags, d)
		},
	)
	if err != nil {
		t.Fatalf("expected child configured program creation to succeed, got %v", err)
	}
	if len(diags) > 0 {
		t.Fatalf("expected no child internal diagnostics, got %#v", diags)
	}
	if program == nil {
		t.Fatal("expected child configured program")
	}
}
