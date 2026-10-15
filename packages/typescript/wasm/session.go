//go:build js && wasm

// Build-overlay addition to the upstream api package; no source checkout is modified.
package api

import (
	"context"

	"github.com/microsoft/TypeScript/tsc/internal/bundled"
	"github.com/microsoft/TypeScript/tsc/internal/ipc"
	"github.com/microsoft/TypeScript/tsc/internal/lsp/lsproto"
	"github.com/microsoft/TypeScript/tsc/internal/project"
	"github.com/microsoft/TypeScript/tsc/internal/vfs/osvfs"
)

func NewSonarWasmSession(options *StdioServerOptions, conn ipc.Conn) *Session {
	ctx := context.Background()
	fs := newCallbackFS(bundled.WrapFS(osvfs.FS()), options.Callbacks, options.UseCaseSensitiveFileNames)
	fs.SetConnection(ctx, conn)
	session := NewStandaloneSession(&project.SessionInit{
		BackgroundCtx: ctx,
		FS:            fs,
		Options: &project.SessionOptions{
			CurrentDirectory:   options.Cwd,
			DefaultLibraryPath: options.DefaultLibraryPath,
			PositionEncoding:   lsproto.PositionEncodingKindUTF8,
		},
	}, &SessionOptions{UseBinaryResponses: true})
	session.SetConnection(conn)
	return session
}
