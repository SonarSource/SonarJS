# JS/TS Go Parity Corpus

Each directory under this corpus is a synthetic project analyzed through the real
`AnalyzeProject` request path on both runtimes.

Conventions:

- The project directory itself is the default `baseDir`.
- `request.json` is optional. When present, it is treated as an
  `AnalyzeProjectRequest` JSON payload and merged with the project `baseDir`.
- Files are discovered from disk by default. The normal path is to omit `files`
  and let Node and Go exercise their own file stores and project discovery.
- Projects should stay focused: one rule family per directory, with source files
  that trigger or suppress the rule intentionally.

Examples:

- `npm run jsts-go-parity:diff -- --project S6551-no-base-to-string`
- `npm run jsts-go-parity:node -- --project S4137-consistent-type-assertions`
- `go run ./server-go/sonar-server --project packages/parity/corpus/S6551-no-base-to-string`
