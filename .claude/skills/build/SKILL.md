---
name: build
description: Build pipeline for SonarJS. Use when asked to build the project, regenerate metadata, understand the build pipeline, or run npm build scripts.
---

## Quick Reference

```bash
npm ci                          # Install dependencies
npm run bbf                     # Fast JS/TS build (no tests): clear lib + generate-meta + compile
npm run generate-meta           # Regenerate generated-meta.ts files from RSPEC JSON
npm run generate-java-rule-classes  # Regenerate Java check classes
mvn install -DskipTests         # Full Maven build without tests
mvn clean install               # Full clean build with tests
```

## When to Run What

| Goal | Command |
|------|---------|
| After editing rule TS code | `npm run bbf` |
| After modifying `config.ts` or `meta.ts` | `npm run generate-meta && npm run bbf` |
| After modifying `fields` array | `npm run generate-meta && npm run generate-java-rule-classes` |
| Full plugin build | `mvn install -DskipTests` |

## Build Pipeline Overview

### `npm run bbf` (bridge:build:fast)

```
bbf
├── rimraf lib/*
├── npm run generate-meta        # RSPEC JSON → generated-meta.ts per rule
└── npm run bridge:compile       # tsgo TypeScript compilation
```

### `npm run generate-meta`

Reads RSPEC metadata from:
```
sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/
```

Writes to (gitignored):
```
packages/jsts/src/rules/SXXXX/generated-meta.ts
```

### Maven Build Phases (relevant for rule work)

1. **javascript-checks** (generate-resources): Downloads RSPEC → deploys to `sonar-plugin/javascript-checks/src/main/resources/`, runs `generate-java-rule-classes`
2. **bridge** (generate-resources): Runs `npm run bbf` (which includes `generate-meta`)
3. **Compile**: Java compilation of all modules

## RSPEC Metadata Chain

```
Remote RSPEC repo
       ↓  (rspec-maven-plugin, gitignored)
resources/rule-data/
       ↓  (npm run deploy-rule-data, committed)
sonar-plugin/javascript-checks/src/main/resources/…/javascript/*.json
       ↓  (npm run generate-meta, gitignored)
packages/jsts/src/rules/SXXXX/generated-meta.ts
```

**Key:** The `sonar-plugin/javascript-checks/src/main/resources/…/javascript/` directory is **committed** (526 files). It is the source of truth for `generate-meta`.

## Generated vs. Committed Files

| Path | Status |
|------|--------|
| `resources/rule-data/` | Gitignored (fresh RSPEC download) |
| `sonar-plugin/javascript-checks/src/main/resources/…/javascript/*.json` | **Committed** |
| `packages/jsts/src/rules/*/generated-meta.ts` | Gitignored |
| `lib/` | Gitignored |

## Build Profiles

```bash
mvn clean install -P coverage-report    # With JaCoCo coverage
SONARSOURCE_QA=true mvn clean install   # With integration tests (qa profile)
```

## Notes

- Do not run `npm run bridge:test` or `npm run ruling` — they take too long
- `generated-meta.ts` files are auto-generated; do not edit manually
- Java check classes in `sonar-plugin/javascript-checks/` are auto-generated
- Requires `GITHUB_TOKEN` env var with read access to `SonarSource/rspec` for Maven builds
