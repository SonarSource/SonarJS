# SonarJS Build

## Default workflow

Run `npm ci` first on a fresh checkout, and again after any `package.json` or lockfile change.

Use `mvn install` for normal development after Node dependencies are installed.
This reuses the tracked rule metadata already present in the checkout unless an explicit RSPEC refresh is requested.

Avoid `mvn clean` while iterating. The fast Java-only loop reuses previously generated artifacts,
and `clean` deletes them. Only use `mvn clean install` when you explicitly want to rebuild generated
assets from scratch. If that clean rebuild should also pick up the latest RSPEC data, run
`npm run rspec:refresh` first.

## Common commands

Full reactor build using the tracked local rule JSON:

```bash
mvn install
```

Full reactor build without tests using the tracked local rule JSON:

```bash
mvn install -DskipTests
```

Clean rebuild using the tracked local rule JSON:

```bash
mvn clean install
```

Refresh RSPEC first, then run a full Maven build:

```bash
npm run rspec:refresh
mvn install
```

Refresh RSPEC first, then run a Maven build without tests:

```bash
npm run rspec:refresh
mvn install -DskipTests
```

Fast Java-only targeted test:

```bash
mvn -pl sonar-plugin/sonar-javascript-plugin -am -Dskip-nodejs -Dskip-java-generation "-Dtest=WebSensorTest" "-Dsurefire.failIfNoSpecifiedTests=false" test
```

Fast Java-only compile loop:

```bash
mvn -pl sonar-plugin/sonar-javascript-plugin -am -Dskip-nodejs -Dskip-java-generation test-compile
```

Bridge-only Node build:

```bash
npm run bridge:build:fast
```

This command also assumes `npm ci` was already run in the checkout.

Regenerate rule metadata:

```bash
npm run generate-meta
```

Refresh tracked RSPEC rule data explicitly:

```bash
npm run rspec:refresh
```

That refresh uses a dedicated root Maven profile. It syncs RSPEC once and generates both JavaScript
and CSS rule data from the same checkout.

Override the default RSPEC branch for one refresh run:

```bash
npm run rspec:refresh -- -Drspec.branch=<rspec-branch>
```

Pin the refresh to an exact RSPEC revision:

```bash
echo "<rspec-commit-sha>" > rspec.sha
npm run rspec:refresh
```

Or pin one refresh run directly from the command line:

```bash
npm run rspec:refresh -- -Drspec.sha=<commit-sha>
```

Refresh RSPEC first, then run the fast local build:

```bash
npm run bbf:latest
```

Validate quickfix declarations:

```bash
npm run validate-quickfix
```

## Baseline CI mismatches

One recurring repository-wide failure mode is:

```text
Mismatch between RSPEC metadata and implementation for fixable attribute in rule ...
```

This means the tracked RSPEC-derived rule metadata and the SonarJS rule implementation are
temporarily out of sync for some rule.

When this appears in CI:

- Check whether the failing rule is part of the pull request diff.
- If the failing rule is unrelated to the pull request, treat it as a baseline/environment blocker
  rather than as work to absorb into that pull request.
- Rebase once on the latest `origin/master` to confirm the mismatch is not already fixed upstream.
- If the same mismatch persists after rebasing and it still points outside the pull request scope,
  stop and report the blocker instead of patching unrelated rules or committing unrelated refreshed
  RSPEC metadata in the pull request.

This guidance is especially important for automated agents, because RSPEC refreshes can update
tracked metadata for rules that have nothing to do with the requested change.

## Reactor order

The `sonar-plugin` reactor builds modules in this order:

1. `api`
2. `javascript-checks`
3. `bridge`
4. `css`
5. `sonar-javascript-plugin`
6. `standalone`

`javascript-checks` stays before `bridge` because bridge generation consumes rule metadata prepared
earlier in the build. The explicit RSPEC refresh path is not part of this normal reactor flow.

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
- `npm run count-rules`
- bridge `npm run bridge:compile`
- bridge `npm run bridge:bundle`
- bridge `npm pack`
- protobuf Java generation for parser and analyze-project gRPC stubs
- copying the packaged bridge tarball into `bridge/target/classes`
- unpacking embedded Node runtimes in `sonar-javascript-plugin`

Important details:

- `npm run generate-meta` reads the tracked local JavaScript rule JSON and does not refresh RSPEC.
- To refresh RSPEC explicitly, or to apply a root `rspec.sha` pin, run `npm run rspec:refresh`.
- `npm run rspec:refresh` uses the configured default RSPEC branch when no SHA pin is active.
- You can override that branch per command with `-Drspec.branch=<rspec-branch>`.
- SHA wins over branch selection: an explicit `-Drspec.sha=...` or a root `rspec.sha` file takes
  precedence over any branch setting.
- The `bridge` module still adds `target/generated-sources` to the Java source roots, so an existing
  generated stub directory can be reused without re-running protobuf generation.
- This flag is intended for Java-only loops after a previous non-skipped build.

Do not use `-Dskip-nodejs`:

- right after `mvn clean`
- on a fresh checkout that has never produced the generated artifacts
- after changing `.proto` files
- after changing bridge TypeScript or bundling inputs
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

- `sonar-plugin/bridge/target/generated-sources`
- `sonar-plugin/bridge/src/main/resources/org/sonar/plugins/javascript/bridge/node-info.properties`
- `sonar-plugin/sonar-javascript-plugin/src/main/resources/node-info.properties`
- `lib/` and `bin/`
- downloaded rule data under `resources/rule-data`
- generated HTML and derived `rspec.sha` files under `sonar-plugin/javascript-checks/src/main/resources`
  and `sonar-plugin/css/src/main/resources`
- generated rule metadata under `packages/analysis/src/jsts/rules`

Important detail:

- The committed JSON/profile rule metadata under `sonar-plugin/*/src/main/resources/**/rules/**`
  is preserved by `clean`.
- Because of that, `npm run bbf` after `mvn clean` still reuses the tracked rule JSON and does not
  trigger an RSPEC refresh.
- The per-language `rspec.sha` files are still meaningful in built release artifacts even though
  they are local derived outputs in the workspace: they preserve which RSPEC revision was used to
  build that analyzer version.

Because of that, a common workflow is:

1. Run one regular build with `mvn install`.
2. Iterate with `-Dskip-nodejs` and optionally `-Dskip-java-generation`.
3. Run another regular build whenever you touch generated inputs.

## Maven phase summary

`initialize`

- validates quickfix declarations
- generates and reads `node-info.properties` for the plugin module

`generate-sources`

- generates protobuf Java sources for parser messages
- generates protobuf Java and gRPC sources for analyze-project

`generate-resources`

- runs `npm run generate-meta`
- runs `npm run generate-java-rule-classes`
- runs `npm run count-rules`
- builds, bundles, and packs the bridge
- generates `bridge/src/main/resources/org/sonar/plugins/javascript/bridge/node-info.properties`

Explicit RSPEC refresh

- `npm run rspec:refresh`
- runs a root, non-recursive Maven profile
- syncs RSPEC once for JavaScript and CSS
- runs `npm run deploy-rule-data`
- does not depend on the `javascript-checks` module lifecycle or hidden file-missing profiles

`process-resources`

- copies the packaged bridge tarball into the bridge module output
- unpacks embedded Node runtimes for plugin packaging

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
  flags and run a regular `mvn install`.
