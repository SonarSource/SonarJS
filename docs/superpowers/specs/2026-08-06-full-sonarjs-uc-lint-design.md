# Full SonarJS Rule Set for `uc sonar lint`

## Goal

Make `uc sonar lint` run the Sonar way configuration from a selected local SonarJS checkout, including original, imported, and decorated JavaScript/TypeScript rules.

## Scope

- Preserve each rule's existing Sonar way recommendation state. Rules that are not recommended remain disabled.
- Add `--sonarjs-checkout <path>` to select a SonarJS checkout or worktree. A configured default is used when the option is absent.
- Do not modify the selected checkout while linting. In particular, `uc` must not write `node_modules`, `lib`, generated files, lockfiles, or cache data there.
- Keep the target project's existing ESLint configuration isolated from the `uc` run.

## Architecture

SonarJS will expose a separate full-plugin entry point. Its generated rule registry contains every JavaScript/TypeScript rule implementation, while its recommended configuration continues to use the rules' generated Sonar way `recommended` metadata. The existing npm-plugin entry point and its original-rule-only registry remain unchanged.

`uc` will treat the selected checkout as immutable input. It computes a source fingerprint from the checkout path, Git revision, tracked modifications, non-ignored untracked files, and dependency lockfile. It copies the matching source snapshot to its own cache, builds the full-plugin tarball there, and installs that tarball into a fingerprinted lint-toolchain cache. ESLint then loads the full-plugin recommended configuration from that cached toolchain.

## Cache and invalidation

- Cache root: `~/.cache/utils-cli/sonar-lint-toolchain/`.
- A changed revision, working-tree source change, untracked source file, or lockfile change creates a new snapshot and toolchain.
- An unchanged fingerprint reuses the built package and avoids a rebuild.
- Failures name the checkout path and build command, while retaining the previous completed cache entry.

## Behavior

`uc sonar lint [path]` uses the configured local SonarJS checkout and its expanded Sonar way profile by default. `uc sonar lint --sonarjs-checkout /path/to/worktree [path]` uses the supplied worktree instead.

The command preserves its current batching, file-size limit, JSON report format, parser setup, base-branch filtering, and disabled inline ESLint configuration. The resulting reports include imported and decorated rules such as S9020.

## Testing

- SonarJS tests verify that the full entry point includes original, external, and decorated rules, while the existing public plugin remains original-only.
- `utils-cli` tests cover default and custom checkout selection, immutable snapshot creation, cache reuse, invalidation after a source change, and build-failure reporting.
- An integration test lints a Testing Library fixture and asserts an S9020 report from the full cached toolchain.

## Non-goals

- Publishing or replacing `eslint-plugin-sonarjs` on npm.
- Enabling non-Sonar-way rules merely because they are exported.
- Using a remote SonarQube server or modifying the analyzed project.
