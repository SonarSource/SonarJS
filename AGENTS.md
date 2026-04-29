# AGENTS.md

This file provides Codex guidance for the SonarJS repository.

## Project Overview

SonarJS is a static code analyzer for JavaScript, TypeScript, and CSS, developed by SonarSource.

## Build Commands

```bash
npm run bbf
mvn install -DskipTests
```

## Important Notes

- `generated-meta.ts` files are auto-generated from RSPEC.
- Java check classes in `sonar-plugin/javascript-checks/` are auto-generated.
- Keep docs up to date when changing build processes or workflows.
- See `.codex/skills/peach-check/` for the Codex Peach Main Analysis triage skill.
- See `.claude/skills/` for the existing Claude repository skills.
