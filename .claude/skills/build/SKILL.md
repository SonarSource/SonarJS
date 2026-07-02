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
npm ci                               # Install dependencies on a fresh checkout
npx tsc -b packages                  # Quickest TypeScript compilation check
npm run bbf                          # Fast local JS/TS build using tracked local rule JSON
npm run bbf:latest                   # Explicit RSPEC refresh, then fast local build
npm run generate-meta                # Regenerate generated-meta.ts from tracked local JS rule JSON
npm run rspec:refresh                # Refresh tracked JS/CSS rule data from RSPEC
npm run generate-java-rule-classes   # Regenerate Java check classes
mvn install -DskipTests              # Full Maven build without tests using current local rule data
mvn clean install                    # Full clean build with tests using current local rule data
```

## Important Rules

- `npm run bbf` and `npm run generate-meta` are the normal offline-friendly local workflow. They use
  the tracked JavaScript rule JSON already present in the checkout and do not implicitly refresh
  RSPEC.
- `npm run rspec:refresh` is the explicit refresh command. It updates the tracked JavaScript and CSS
  rule data from RSPEC in one pass.
- `npm run bbf:latest` is the convenience form of `npm run rspec:refresh && npm run bbf`.
- `mvn install` / `mvn clean install` reuse the tracked local rule JSON and do not implicitly
  refresh RSPEC.
- If you want refreshed RSPEC data before a full Maven build, run `npm run rspec:refresh` first and
  then invoke Maven directly.
- If the repository root contains `rspec.sha`, refresh uses that pinned RSPEC revision. The root
  `rspec.sha` file is a temporary local workflow input and must never be committed to `master`.
- When no SHA pin is active, refresh uses the configured default RSPEC branch. Override it per
  command with `-Drspec.branch=<rspec-branch>`.
- SHA takes precedence over branch selection: an explicit `-Drspec.sha=...` or a root `rspec.sha`
  file wins over any branch setting.
- Normal local `bbf` / `generate-meta` usage does not require GitHub auth when tracked metadata is
  already present. Auth is needed only for explicit RSPEC refresh flows.
- `generated-meta.ts` files and generated Java check classes are derived outputs; do not edit them
  manually.
