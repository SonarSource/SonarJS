# Upstream Provenance and Sync

This directory no longer consumes `oxc-project/tsgolint` as a submodule or build/runtime dependency.

The live upstream inputs today are:

- the `server-go/typescript-go` submodule
- the Sonar-owned patch stack in `server-go/patches/typescript-go`
- the Sonar-owned shim modules in `server-go/shim`

`server-go/sonar-server` is therefore a mixed codebase:

- Sonar-owned request/runtime integration and build wiring
- locally maintained code that was originally copied from or adapted from `tsgolint`

This note is intentionally a working provenance map, not a legal or line-by-line origin audit.

## Last Explicit `tsgolint` Pin

Before commit `32423dd270` removed the `tsgolint` submodule, this branch still tracked:

- submodule path: `tsgolint`
- submodule URL: `https://github.com/oxc-project/tsgolint.git`
- last recorded gitlink: `2b933a935b1f9ed66d28efd637fec50ed91c2d78`

That gitlink is the best repository-level reference for the upstream snapshot this branch was built around before the code was centralized under `server-go/`.

## Working Ancestry Map

Use this as the practical map when deciding whether a future change should be checked against upstream `tsgolint`.

Likely to have substantial `tsgolint` ancestry:

- `server-go/sonar-server/internal/linter/*`
- `server-go/sonar-server/internal/rule/*`
- `server-go/sonar-server/internal/rules/*`
- `server-go/sonar-server/internal/collections/*`
- TypeScript-ESLint compatibility helpers under `server-go/sonar-server/internal/utils/*`

Primarily Sonar-owned and not expected to track `tsgolint` upstream directly:

- `server-go/sonar-server/service.go`
- `server-go/sonar-server/normalize.go`
- `server-go/sonar-server/filesystem.go`
- `server-go/sonar-server/file_stores.go`
- `server-go/sonar-server/path_patterns.go`
- `server-go/sonar-server/dependency_signals.go`
- `server-go/sonar-server/requested_rules.go`
- `server-go/sonar-server/generated_rule_metadata.go`
- `server-go/sonar-server/grpc/*`
- `server-go/shim/*`
- `server-go/patches/typescript-go/*`
- Java bridge, Maven wiring, docs, and integration tests outside `server-go`

Some files are mixed. When in doubt, treat the local file as Sonar-owned code and bring upstream changes in selectively instead of trying to preserve a 1:1 mirror.

## Current Upstream Policy

For `typescript-go`:

- upstream is tracked explicitly through the `server-go/typescript-go` submodule
- the build initializes that submodule
- the build applies the local patch stack from `server-go/patches/typescript-go`

For `tsgolint`:

- there is no automated sync
- there is no CI job that fetches or diffs upstream changes
- there is no bot or script that alerts on upstream drift

At this point `tsgolint` is a reference implementation, not a dependency.

## Manual `tsgolint` Intake Checklist

When we want to pull a fix or behavior change from upstream `tsgolint`, do it intentionally:

1. Pick the upstream commit or tag and record it in the PR description.
2. Compare only the relevant upstream scope against our local code.
3. Import the change into `server-go/sonar-server`, adapting it to our local `AnalyzeProject` contract, rule-selection logic, and issue conversion.
4. If the change needs additional `typescript-go` internals, prefer extending `server-go/shim/*` or `server-go/patches/typescript-go/*` instead of reintroducing a `tsgolint` dependency.
5. Validate with `go test ./...` in `server-go/sonar-server` and the relevant Maven build/test commands.
6. Update this file if the ancestry map or the last reviewed upstream snapshot changes materially.

## Recommended Discipline

- Treat upstream `tsgolint` imports as manual cherry-picks, not as periodic blind resyncs.
- Record the upstream commit in every PR that copies logic from `tsgolint`.
- Keep the `typescript-go` submodule and patch stack as the only automated upstream-moving part of this tree.
