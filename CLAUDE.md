# CLAUDE.md

This file provides guidance for Claude Code when working with the SonarJS repository.

## Project Overview

SonarJS is a static code analyzer for JavaScript, TypeScript, and CSS, developed by SonarSource. It provides:

- JavaScript and TypeScript rules with advanced pattern matching and control flow analysis
- CSS rules for style analysis
- Integration with SonarQube and SonarCloud
- An ESLint plugin (`eslint-plugin-sonarjs`)

## Project Structure

```
SonarJS/
├── packages/                    # TypeScript source code
│   ├── jsts/                    # JS/TS analyzer (main rules)
│   │   ├── src/rules/           # Rule implementations (S100-S7xxx)
│   │   └── tests/               # Unit tests
│   ├── css/                     # CSS analyzer
│   ├── bridge/                  # Node.js ↔ SonarQube bridge server
│   ├── shared/                  # Shared utilities
│   ├── html/                    # HTML/Vue template support
│   └── yaml/                    # YAML support
├── sonar-plugin/                # Maven-based Java plugin
│   ├── sonar-javascript-plugin/ # Main plugin artifact
│   ├── javascript-checks/       # Auto-generated Java check classes
│   └── ...
├── its/                         # Integration tests
├── tools/                       # Build and generation scripts
└── lib/                         # Compiled bridge output (build artifact)
```

## Build Commands

```bash
npm run bbf                     # Fast JS/TS build (no tests)
mvn install -DskipTests         # Complete build without Java tests
```

See `/build` for the full build pipeline reference.

## Code Style

- 2 spaces indentation, LF line endings, single quotes, trailing commas
- Formatting enforced via pre-commit hooks

## Pull Requests

- Always add `SonarSource/quality-web-squad` as a reviewer when creating PRs

## Important Notes

- `generated-meta.ts` files are auto-generated from RSPEC — do not edit manually
- Java check classes in `sonar-plugin/javascript-checks/` are auto-generated
- Rules use ESLint's visitor pattern
- **Keep docs up to date** when changing build processes or workflows
- See `.claude/rules.md` for rule development guidelines
- See `.claude/skills/` for task-specific skills: `/build`, `/test-rule`, `/ruling`, `/new-rule`, `/rule-options`
