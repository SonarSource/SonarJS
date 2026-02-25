---
name: ruling
description: Run ruling integration tests and update expected results for SonarJS rules. Use when running ruling tests or syncing expected ruling output.
disable-model-invocation: true
---

## Overview

Ruling tests analyze large third-party codebases (JS/TS and CSS) and compare issues against expected output. Run them when adding or modifying rules to verify real-world behavior.

> **Warning:** Running ruling tests removes `node_modules` from the project root. Run `npm ci` afterward.

## Running Ruling

```bash
# Prerequisite: rebuild the jar first
mvn install -DskipTests

# Run ruling (JS/TS and CSS)
npm run ruling

# Sync actual → expected (after reviewing output)
npm run ruling-sync

# Debug differences
sh tools/ruling-debug-script.sh
```

Results:
- Actual: `packages/ruling/actual/`
- Expected: `its/ruling/src/test/expected/`

## Java Ruling (Old Way)

```bash
cd its/ruling
mvn verify -Dtest=RulingTest -Dmaven.test.redirectTestOutputToFile=false
```

Copy actual to expected:
```bash
cp -R target/actual/ src/test/expected/
```

Review diff:
```bash
diff -rq src/test/expected target/actual
```

## Custom Source Files for New Rules

If a new rule raises no issues on existing sources, add test code:

- `its/sources/custom/jsts/S1234.js` — regular code
- `its/sources/custom/jsts/tests/S1234.js` — test code

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
