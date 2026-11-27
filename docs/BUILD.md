# SonarJS Build

For the GitHub Actions pipeline, cache design, artifacts, job graph, and external CI integrations, see [CI.md](CI.md).

## Default workflow

Run `mise install` to provision the pinned tools, then `mise run install:npm` on a fresh checkout
and after any `package.json` or lockfile change. Check tasks do not reinstall dependencies.
Use `mise tasks` to find the smallest task for your change. Tasks run against tracked rule data
unless you explicitly run `mise run generate:rspec`.

## CI-backed tasks

| Task                                                  | When to use it                                                                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build:analysis-server`                               | Generate metadata and compile the Node.js server and its tests.                                                                                    |
| `test:analysis-server` / `coverage:analysis-server`   | Run the compiled unit tests, with Sonar reports for the coverage task.                                                                             |
| `build:eslint-plugin`                                 | Type-check and build the npm tarball.                                                                                                              |
| `test:eslint-plugin:eslint8`, `:eslint9`, `:eslint10` | Test an existing tarball with that ESLint major and its minimum Node version.                                                                      |
| `build:plugin`                                        | Build and install the Maven reactor, including Java unit tests and the SBOM. Set `MAVEN_GOAL` or `MAVEN_PROFILES` to override `install` or `sbom`. |
| `test:plugin:<module>`                                | Run a Maven module's Java tests after `build:plugin`, reusing generated artifacts.                                                                 |
| `test:its:<suite>` / `test:ruling:<component>`        | Run integration or ruling checks; see prerequisites below.                                                                                         |
| `test:ci`, `lint:knip`, `license:headers`             | Run CI helper tests, unused-code checks, or source license-header checks.                                                                          |

For example, run one rule's compiled tests instead of the full CI suite:

```bash
mise run test:analysis-server lib/analysis/src/jsts/rules/S905/unit.test.js
```

Use a component's parent task (such as `test:plugin` or `test:eslint-plugin`) for broader checks.
`test:its` selects the fast suites for the current Node.js environment. The embedded-runtime check
requires no `node` on `PATH`; set `MISE_DISABLE_TOOLS=node` to keep mise from activating one.

Build and install the plugin before running the integration or Java ruling tests. Ruling also needs
`its/sources` initialized for a normal local run. Integration tasks accept `ITS_TESTS` (Surefire
selection), `SONAR_RUNTIME_VERSION` (defaults to `LATEST_RELEASE`), and the optional Orchestrator
settings `ORCHESTRATOR_CONFIG_URL` and `ORCHESTRATOR_HOME`. If required services or credentials
are unavailable, report the check as not run. See [CI.md](CI.md) for the CI variants.

## Specialized commands

Use `mise exec --` for flags and maintenance commands not covered by tasks. Avoid `clean` when
iterating: it deletes the generated outputs needed by the fast Java-only loop.

Generate and attach the analyzer CycloneDX SBOM:

```bash
mise exec -- mvn -Psbom -pl sonar-plugin/sonar-javascript-plugin -am package
```

The `sbom` profile is enabled by `build:plugin` and is opt-in when running Maven directly.
It generates the Maven and npm BOMs, hierarchically merges them,
validates the result, and verifies that every npm package included by esbuild is represented.

The pinned CycloneDX CLI is stored under `${XDG_CACHE_HOME:-$HOME/.cache}/cyclonedx-cli` after its
SHA-256 checksum is verified. Set `CYCLONEDX_CLI_CACHE_DIR` to override that location.

Clean rebuild using the tracked local rule JSON:

```bash
mise exec -- mvn clean install
```

To build without tests, pass `-DskipTests` through Maven's environment:

```bash
MAVEN_ARGS=-DskipTests mise run build:plugin
```

Fast Java-only targeted test:

```bash
mise exec -- mvn -pl sonar-plugin/sonar-javascript-plugin -am -Dskip-nodejs -Dskip-java-generation "-Dtest=WebSensorTest" "-Dsurefire.failIfNoSpecifiedTests=false" test
```

Fast Java-only compile loop:

```bash
mise exec -- mvn -pl sonar-plugin/sonar-javascript-plugin -am -Dskip-nodejs -Dskip-java-generation test-compile
```

Regenerate rule metadata:

```bash
mise exec -- npm run generate-meta
```

Refresh tracked RSPEC rule data explicitly:

```bash
mise run generate:rspec
```

That refresh uses a dedicated root Maven profile. It syncs RSPEC once during `generate-resources`,
then deploys the JavaScript and CSS rule data during `process-resources`.

Override the default RSPEC branch for one refresh run:

```bash
mise run generate:rspec -- -- -Drspec.branch=<rspec-branch>
```

Pin the refresh to an exact RSPEC revision:

```bash
echo "<rspec-commit-sha>" > rspec.sha
mise run generate:rspec
```

Or pin one refresh run directly from the command line:

```bash
mise run generate:rspec -- -- -Drspec.sha=<commit-sha>
```

Refresh RSPEC first, then run the fast local build:

```bash
mise run generate:rspec && mise run build:analysis-server
```

Validate quickfix declarations:

```bash
mise exec -- npm run validate-quickfix
```

## Baseline CI mismatches

Local builds and CI do not consume RSPEC data the same way:

- `build:analysis-server` and `build:plugin` reuse the tracked JavaScript rule JSON already present
  in the checkout unless you explicitly run `generate:rspec`.
- In GitHub Actions, `prepare_rspec_rule_data` refreshes RSPEC first and uploads an
  `rspec-rule-data-${github.sha}` artifact. Downstream jobs use that refreshed artifact instead of
  the tracked JSON from the branch.
- The nightly `generated_files_freshness` workflow keeps the tracked JSON on `master` reasonably
  fresh, but pull request CI does not wait for those tracked files to be updated. That job also
  regenerates the tracked README files and opens or updates the generated-files PR. README
  generation is intentionally not part of the normal Maven lifecycle.

Because of that, pull request CI can fail even when the tracked JSON in the branch still looks
consistent.

In other words, CI is validating against freshly refreshed RSPEC data, not only against the metadata
tracked in Git.

One recurring failure class is temporary drift between freshly refreshed RSPEC metadata and the
SonarJS implementation. This can happen in either direction when RSPEC and SonarJS changes merge in
different orders, so `master` can temporarily go red until the lagging side catches up.

One common symptom is:

```text
Mismatch between RSPEC metadata and implementation for fixable attribute in rule ...
```

That error is thrown later in the build when a rule module calls `generateMeta(...)`. Another common
surface is `npm run validate-quickfix`, which can fail with messages such as:

- `RSPEC declares quickfix='covered' but rule has neither fixable nor hasSuggestions`
- `Rule has fixable or hasSuggestions but RSPEC doesn't declare quickfix='covered'`
- `Rule is fixable but meta.ts doesn't export quickFixMessage`

When one of these failures appears in CI:

1. Identify the failing rule and check whether your pull request actually changes that rule.
2. Rebase once on the latest `origin/master` to confirm the mismatch is not already fixed upstream.
3. If the same failure persists after rebasing and the rule is still unrelated to your change,
   treat it as a baseline blocker rather than as work to absorb into your pull request.
4. Determine which side is behind:
   - If RSPEC now says `quickfix='covered'` but the SonarJS rule has neither `fixable` nor
     `hasSuggestions`, the SonarJS implementation usually still needs to catch up.
   - If the SonarJS rule already has `fixable` or `hasSuggestions` but RSPEC does not declare
     `quickfix='covered'`, the RSPEC metadata usually still needs to catch up.
   - If the rule is fixable but `quickFixMessage` is missing, SonarJS metadata still needs to catch
     up.
5. Fix the lagging repository, or wait for the already-merged fix to reach the branch you are
   building.
6. Do not patch unrelated rules or commit unrelated refreshed RSPEC metadata just to make the pull
   request green.

When the mismatch is intentional because your SonarJS pull request depends on an RSPEC change that
is not yet merged on the default RSPEC branch, make that dependency explicit:

- create or update the matching RSPEC pull request
- point the root `rspec.sha` file in the SonarJS branch to a commit from that RSPEC branch
- let CI refresh against that exact RSPEC revision while the two pull requests move together

This is the normal workflow both when adding quickfix support and needing RSPEC to start declaring
`quickfix='covered'`, and when removing quickfix support and needing RSPEC to stop declaring it.
Remove the temporary root `rspec.sha` before merging to `master` once the RSPEC change has landed on
the intended default branch.

Concrete examples:

- `S5914` started failing in CI after refreshed RSPEC metadata declared `quickfix='covered'` before
  the matching SonarJS implementation change had merged. That was fixed on the SonarJS side in
  [#7435](https://github.com/SonarSource/SonarJS/pull/7435).
- `S7743` and `S7761` failed in `validate-quickfix` during an unrelated SonarJS update because the
  RSPEC quickfix metadata was lagging. That was fixed on the RSPEC side in
  [SonarSource/rspec#7088](https://github.com/SonarSource/rspec/pull/7088).

This guidance applies to humans and automated agents alike.

## Reactor order

The `sonar-plugin` reactor builds modules in this order:

1. `api`
2. `javascript-checks`
3. `analysis-client`
4. `css`
5. `sonar-javascript-plugin`
6. `standalone`

Shared rule metadata and Java rule classes are generated once by the `sonar-plugin` aggregator
before the child modules build. The analysis client therefore does not need an artificial dependency on
`javascript-checks` to order metadata generation. The explicit RSPEC refresh path is not part of
this normal reactor flow.

## Fast Java iteration flags

The fast path is implemented with property-activated profiles in `sonar-plugin/pom.xml`. These are
repo-specific toggles, not built-in Maven flags.

### `-Dskip-nodejs`

`-Dskip-nodejs` sets the Node/protobuf generation phases to `none`.

It skips:

- `npm run validate-quickfix`
- `tools/sync-nodejs-versions.mjs`
- `npm run generate-meta`
- `npm run generate-java-rule-classes`
- analysis server compilation (`npm run bridge:compile`), bundling (`npm run bridge:bundle`),
  and packaging (`npm pack`)
- protobuf Java generation for parser and analyze-project gRPC stubs
- copying the packaged analysis server tarball into `sonar-plugin/analysis-client/target/classes`
- unpacking embedded Node runtimes in `sonar-javascript-plugin`
- CycloneDX SBOM generation and attachment, even when `-Psbom` is also supplied

Important details:

- `npm run generate-meta` reads the tracked local JavaScript rule JSON and does not refresh RSPEC.
- To refresh RSPEC explicitly, or to apply a root `rspec.sha` pin, run `npm run rspec:refresh`.
- `npm run rspec:refresh` uses the configured default RSPEC branch when no SHA pin is active.
- You can override that branch per command with `-Drspec.branch=<rspec-branch>`.
- SHA wins over branch selection: an explicit `-Drspec.sha=...` or a root `rspec.sha` file takes
  precedence over any branch setting.
- The `analysis-client` module still adds `target/generated-sources` to the Java source roots, so an existing
  generated stub directory can be reused without re-running protobuf generation.
- This flag is intended for Java-only loops after a previous non-skipped build.

Do not use `-Dskip-nodejs`:

- right after `mvn clean`
- on a fresh checkout that has never produced the generated artifacts
- after changing `.proto` files
- after changing analysis server TypeScript or bundling inputs
- after changing `package.json` Node version metadata
- after changing RSPEC sync / metadata generation inputs

### `-Dskip-java-generation`

`-Dskip-java-generation` only disables `npm run generate-java-rule-classes`.

Use it when:

- you are iterating on Java code and do not need to regenerate rule classes
- you want to keep Node-based steps enabled but avoid the Java rule generator

It can be combined with `-Dskip-nodejs`.

## What `clean` removes

The clean phase removes the derived outputs that make the fast loop work:

- `sonar-plugin/analysis-client/target/generated-sources`
- `sonar-plugin/analysis-client/src/main/resources/org/sonar/plugins/javascript/bridge/node-info.properties`
- `sonar-plugin/sonar-javascript-plugin/src/main/resources/node-info.properties`
- `lib/` and `bin/`
- downloaded rule data under `resources/rule-data`
- generated HTML and derived `rspec.sha` files under `sonar-plugin/javascript-checks/src/main/resources`
  and `sonar-plugin/css/src/main/resources`
- generated rule metadata under `packages/analysis/src/jsts/rules`

Important detail:

- The committed rule JSON under `sonar-plugin/*/src/main/resources/**/rules/**` is preserved by
  `clean`; `generate-java-rule-classes` compiles its profile metadata into the generated Java rule
  indexes used to define built-in quality profiles.
- Because of that, `npm run bbf` after `mvn clean` still reuses the tracked rule JSON and does not
  trigger an RSPEC refresh.
- The per-language `rspec.sha` files are still meaningful in built release artifacts even though
  they are local derived outputs in the workspace: they preserve which RSPEC revision was used to
  build that analyzer version.

Because of that, a common workflow is:

1. Run one regular build with `mise run build:plugin`.
2. Iterate with `-Dskip-nodejs` and optionally `-Dskip-java-generation`.
3. Run another regular build whenever you touch generated inputs.

## Maven phase summary

`initialize`

- validates quickfix declarations
- generates `node-info.properties` for the plugin module

`generate-sources`

- generates protobuf Java sources for parser messages
- generates protobuf Java and gRPC sources for analyze-project

`generate-resources`

- reads the plugin module's generated `node-info.properties`
- runs `npm run generate-meta`
- runs `npm run generate-java-rule-classes`
- builds, bundles, and packs the analysis server
- generates `sonar-plugin/analysis-client/src/main/resources/org/sonar/plugins/javascript/bridge/node-info.properties`

Explicit RSPEC refresh

- `npm run rspec:refresh`
- runs a root-owned, non-recursive Maven profile
- syncs RSPEC once for JavaScript and CSS during `generate-resources`
- runs `npm run deploy-rule-data` during `process-resources`
- does not depend on the `javascript-checks` module lifecycle or hidden file-missing profiles

`process-resources`

- copies the packaged analysis server tarball into the analysis client module output
- unpacks embedded Node runtimes for plugin packaging

`prepare-package`, `package` with `-Psbom`

- generates the Maven and production npm CycloneDX BOMs
- merges them into the analyzer-owned `json:cyclonedx` sidecar
- validates the CycloneDX document and checks it against the esbuild dependency metafile
- attaches the merged sidecar for Maven install/deploy

`compile`, `test`, `package`, `verify`, `install`

- compile Java sources
- run unit tests
- assemble plugin artifacts
- run packaging checks
- install artifacts in the local Maven repository

## Notes

- `-Dsurefire.failIfNoSpecifiedTests=false` is useful with `-pl ... -am -Dtest=...` because upstream
  modules in the reactor may not contain the selected test class.
- If the fast path starts failing because generated artifacts are missing or stale, drop the skip
  flags and run `mise run build:plugin`.
