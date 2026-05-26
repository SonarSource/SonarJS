# SonarJS Build

## Default workflow

Run `npm ci` first on a fresh checkout, and again after any `package.json` or lockfile change.

Use `mvn install` for normal development after Node dependencies are installed.

Avoid `mvn clean` while iterating. The fast Java-only loop reuses previously generated artifacts, and `clean` deletes them. Only use `mvn clean install` when you explicitly want to rebuild generated assets from scratch.

## Common commands

Full reactor build:

```bash
mvn install
```

Clean rebuild:

```bash
mvn clean install
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

Validate quickfix declarations:

```bash
npm run validate-quickfix
```

## Reactor order

The `sonar-plugin` reactor builds modules in this order:

1. `api`
2. `javascript-checks`
3. `bridge`
4. `css`
5. `sonar-javascript-plugin`
6. `standalone`

`javascript-checks` stays before `bridge` because bridge generation consumes rule metadata prepared earlier in the build.

## Fast Java iteration flags

The fast path is implemented with property-activated profiles in `sonar-plugin/pom.xml`.
These are repo-specific toggles, not built-in Maven flags.

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

- `npm run generate-meta` already includes RSPEC sync and JS/TS proto generation, so those are skipped too.
- The `bridge` module still adds `target/generated-sources` to the Java source roots, so an existing generated stub directory can be reused without re-running protobuf generation.
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

The clean phase removes the outputs that make the fast loop work:

- `sonar-plugin/bridge/target/generated-sources`
- `sonar-plugin/bridge/src/main/resources/org/sonar/plugins/javascript/bridge/node-info.properties`
- `sonar-plugin/sonar-javascript-plugin/src/main/resources/node-info.properties`
- `lib/` and `bin/`
- downloaded rule data under `resources/rule-data`
- generated rule metadata under `packages/analysis/src/jsts/rules`

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

- `-Dsurefire.failIfNoSpecifiedTests=false` is useful with `-pl ... -am -Dtest=...` because upstream modules in the reactor may not contain the selected test class.
- If the fast path starts failing because generated artifacts are missing or stale, drop the skip flags and run a regular `mvn install`.
