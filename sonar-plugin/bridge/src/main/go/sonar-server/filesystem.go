package main

import (
	"time"

	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/vfs"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

func BuildAnalyzeProjectFS(input *NormalizedAnalyzeProjectInput) vfs.FS {
	baseFS := bundled.WrapFS(cachedvfs.From(baseAnalyzeProjectFS(input)))
	if input == nil || len(input.VirtualFiles) == 0 {
		return baseFS
	}
	return utils.NewOverlayVFS(baseFS, input.VirtualFiles)
}

func baseAnalyzeProjectFS(input *NormalizedAnalyzeProjectInput) vfs.FS {
	if canAccessFileSystem(input) {
		return osvfs.FS()
	}
	return denyAllFS{}
}

func canAccessFileSystem(input *NormalizedAnalyzeProjectInput) bool {
	if input == nil || input.Config.CanAccessFileSystem == nil {
		return true
	}
	return *input.Config.CanAccessFileSystem
}

type denyAllFS struct{}

func (denyAllFS) UseCaseSensitiveFileNames() bool {
	return osvfs.FS().UseCaseSensitiveFileNames()
}

func (denyAllFS) FileExists(path string) bool {
	return false
}

func (denyAllFS) ReadFile(path string) (contents string, ok bool) {
	return "", false
}

func (denyAllFS) WriteFile(path string, data string) error {
	return vfs.ErrPermission
}

func (denyAllFS) Remove(path string) error {
	return vfs.ErrPermission
}

func (denyAllFS) Chtimes(path string, aTime time.Time, mTime time.Time) error {
	return vfs.ErrPermission
}

func (denyAllFS) DirectoryExists(path string) bool {
	return false
}

func (denyAllFS) GetAccessibleEntries(path string) vfs.Entries {
	return vfs.Entries{}
}

func (denyAllFS) Stat(path string) vfs.FileInfo {
	return nil
}

func (denyAllFS) WalkDir(root string, walkFn vfs.WalkDirFunc) error {
	return nil
}

func (denyAllFS) Realpath(path string) string {
	return path
}
