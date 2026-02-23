---
name: ruling
description: Run ruling integration tests and update expected results for SonarJS rules. Use when running ruling tests or syncing expected ruling output.
disable-model-invocation: true
---

## Overview

Ruling tests analyze large third-party codebases and compare issues against expected output. Run them when adding or modifying rules to verify real-world behavior.

> **Warning:** Running ruling tests removes `node_modules` from the project root. Run `npm ci` afterward.

## JS/TS Ruling

```bash
# Prerequisite: rebuild the jar first
mvn install -DskipTests

# Run ruling
npm run ruling

# Sync actual → expected (after reviewing output)
npm run ruling-sync

# Debug differences
sh tools/ruling-debug-script.sh
```

Results:
- Actual: `packages/ruling/actual/`
- Expected: `its/ruling/src/test/resources/expected/`

## CSS Ruling

```bash
cd its/ruling
mvn verify -Dtest=CssRulingTest -Dmaven.test.redirectTestOutputToFile=false
```

Then copy actual to expected:
```bash
cp -R target/actual/css/ src/test/expected/css
```

## Old JS/TS Way (Maven)

```bash
cd its/ruling
mvn verify -Dtest=JsTsRulingTest -Dmaven.test.redirectTestOutputToFile=false
```

Copy actual to expected:
```bash
cp -R target/actual/jsts/ src/test/expected/jsts
```

Review diff:
```bash
diff -rq src/test/expected/jsts target/actual/jsts
```

## Custom Source Files for New Rules

If a new rule raises no issues on existing sources, add test code:

- `its/sources/jsts/custom/S1234.js` — regular code
- `its/sources/jsts/custom/tests/S1234.js` — test code

Copy from RSPEC HTML description (compliant/non-compliant examples).

## Debugging with Node Process

To debug the Node.js bridge during ruling:

1. Start your Node.js process manually
2. Set `SONARJS_EXISTING_NODE_PROCESS_PORT=<port>`
3. Remove `@Execution(ExecutionMode.CONCURRENT)` from the ruling test class (for serial execution)

## Submodule Setup

If submodules aren't checked out:

```bash
git submodule init
git submodule update
```
