package utils

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
)

func TestCompilerHostQueriesAncestorNodeModulesByDefault(t *testing.T) {
	rootDir := tspath.NormalizePath(t.TempDir())
	baseDir := tspath.CombinePaths(rootDir, "project")
	outsideFile := tspath.CombinePaths(rootDir, "external", "node_modules", "pkg", "index.d.ts")

	writeNormalizedFile(t, outsideFile, "export declare const answer: number;\n")

	host := NewCompilerHost(baseDir, bundled.WrapFS(osvfs.FS()), bundled.LibPath(), nil, nil)

	if !host.FS().FileExists(outsideFile) {
		t.Fatalf("expected %s to remain visible when the skip flag is disabled", outsideFile)
	}

	contents, ok := host.FS().ReadFile(outsideFile)
	if !ok {
		t.Fatalf("expected to read %s when the skip flag is disabled", outsideFile)
	}
	if contents != "export declare const answer: number;\n" {
		t.Fatalf("unexpected contents for %s: %q", outsideFile, contents)
	}
}

func TestCompilerHostSkipsNodeModulesOutsideBaseDirWhenConfigured(t *testing.T) {
	rootDir := tspath.NormalizePath(t.TempDir())
	baseDir := tspath.CombinePaths(rootDir, "project")
	insideFile := tspath.CombinePaths(baseDir, "node_modules", "pkg", "inside.d.ts")
	outsideDir := tspath.CombinePaths(rootDir, "external", "node_modules", "pkg")
	outsideFile := tspath.CombinePaths(outsideDir, "index.d.ts")

	writeNormalizedFile(t, insideFile, "export declare const inside: number;\n")
	writeNormalizedFile(t, outsideFile, "export declare const outside: number;\n")

	host := NewCompilerHost(
		baseDir,
		bundled.WrapFS(osvfs.FS()),
		bundled.LibPath(),
		nil,
		nil,
		WithSkipNodeModuleLookupOutsideBaseDir(baseDir),
	)

	if host.FS().FileExists(outsideFile) {
		t.Fatalf("expected %s to be hidden by the skip flag", outsideFile)
	}

	if contents, ok := host.FS().ReadFile(outsideFile); ok || contents != "" {
		t.Fatalf("expected %s to be unreadable, got ok=%t contents=%q", outsideFile, ok, contents)
	}

	if host.FS().DirectoryExists(outsideDir) {
		t.Fatalf("expected %s to be hidden by the skip flag", outsideDir)
	}

	entries := host.FS().GetAccessibleEntries(outsideDir)
	if len(entries.Files) != 0 || len(entries.Directories) != 0 {
		t.Fatalf("expected no accessible entries for %s, got %#v", outsideDir, entries)
	}

	if !host.FS().FileExists(insideFile) {
		t.Fatalf("expected %s under baseDir to remain visible", insideFile)
	}

	contents, ok := host.FS().ReadFile(insideFile)
	if !ok {
		t.Fatalf("expected %s under baseDir to remain readable", insideFile)
	}
	if contents != "export declare const inside: number;\n" {
		t.Fatalf("unexpected contents for %s: %q", insideFile, contents)
	}

	libFile := bundled.LibPath() + "/lib.esnext.d.ts"
	if !host.FS().FileExists(libFile) {
		t.Fatalf("expected bundled lib %s to remain visible", libFile)
	}
	if _, ok := host.FS().ReadFile(libFile); !ok {
		t.Fatalf("expected bundled lib %s to remain readable", libFile)
	}
}

func writeNormalizedFile(t *testing.T, normalizedPath string, content string) {
	t.Helper()

	nativePath := filepath.FromSlash(normalizedPath)
	if err := os.MkdirAll(filepath.Dir(nativePath), 0o755); err != nil {
		t.Fatalf("failed to create %s: %v", normalizedPath, err)
	}
	if err := os.WriteFile(nativePath, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write %s: %v", normalizedPath, err)
	}
}
