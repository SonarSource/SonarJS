---
name: build
description: Build pipeline for SonarJS. Use when asked to build the project, regenerate metadata, understand the build pipeline, or run npm build scripts.
---

Canonical build instructions live in `docs/BUILD.md`, with RSPEC access and pinning details in
`docs/DEV.md`.

Read those docs before giving build guidance. Do not duplicate or fork their command descriptions in
answers when a direct reference to the canonical docs is clearer.

## Quick Reference

```bash
mise tasks                       # Discover the tasks CI runs
mise run install:npm             # Install npm dependencies on a fresh checkout
mise run build:analysis-server   # Compile the analysis server and tests
mise run build:plugin            # Build and install the Maven reactor
mise run build:eslint-plugin     # Build the ESLint tarball
mise run generate:rspec          # Intentionally refresh tracked rule data
```

## Important Rules

- Start with the smallest task for your change. Builds use the tracked rule data and do not
  implicitly refresh RSPEC. If you need refreshed data, run `mise run generate:rspec` first.
- Use `mise exec --` for maintenance commands without a task. See `docs/BUILD.md` for examples.
- If the repository root contains `rspec.sha`, refresh uses that pinned RSPEC revision. The root
  `rspec.sha` file is a temporary local workflow input and must never be committed to `master`.
- When no SHA pin is active, refresh uses the configured default RSPEC branch. Override it per
  command with `-Drspec.branch=<rspec-branch>`.
- SHA takes precedence over branch selection: an explicit `-Drspec.sha=...` or a root `rspec.sha`
  file wins over any branch setting.
- RSPEC refresh requires GitHub authentication; builds using the tracked rule data do not.
- `generated-meta.ts` files and generated Java check classes are derived outputs; do not edit them
  manually.
