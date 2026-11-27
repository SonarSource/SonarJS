# SonarJS agent guidance

## Scope

SonarJS analyzes JavaScript, TypeScript and CSS for SonarQube Server, SonarQube Cloud and SonarQube for IDE, including embedded code in HTML, Vue and YAML. It also publishes `eslint-plugin-sonarjs` from the JavaScript and TypeScript rules in `packages/analysis` using `tsconfig-plugin.json`.

The Java plugin (`sonar-plugin/`) exposes the custom-rules API and talks to the Node.js analysis server (`packages/analysis`, `packages/grpc`, `packages/shared`) through its analysis client (`sonar-plugin/analysis-client`). Plugin and ESLint integration tests live under `its/`; ruling uses `packages/ruling` and `its/ruling`. There are no component-specific `AGENTS.md` files.

## Commands

- Run `mise install` to install the toolchain pinned in [`mise.toml`](mise.toml).
- Run `mise run install:npm` after a fresh checkout or a change to `package.json` or the lockfile.
- Run every build and check through mise. `mise tasks` lists the tasks; CI's check steps are named after the tasks they run. Start with the smallest leaf task that covers the change, then run the component task if needed. See [the build guide](docs/BUILD.md#ci-backed-tasks) for examples. For commands without a task, use `mise exec --`.

## Constraints

- This repository is public, including agent instructions and docs. Do not put internal URLs, credentials, customer names or roadmaps in it.
- Use two-space indentation, LF line endings, single quotes and trailing commas. The pre-commit hook enforces formatting.
- Keep the source license headers; see [`LICENSE.txt`](LICENSE.txt) and the license configuration in [`pom.xml`](pom.xml).
- Write few comments. Keep only short comments that explain intent the code cannot express; do not restate the code, recount past decisions or describe rollout steps.
- Search for and reuse an existing helper before adding one. If none fits, put the new helper in the appropriate shared module rather than in an individual rule.
- Keep one source of truth for each fact, constant or list. Link to it rather than copying it.
- Do not edit generated files by hand, including `generated-meta.ts` and the Java check classes in `sonar-plugin/javascript-checks/`. See [generated sources](docs/generated-sources.md) and the [build guide](docs/BUILD.md) for regeneration.
- Follow [baseline CI mismatch guidance](docs/BUILD.md#baseline-ci-mismatches) for RSPEC-related failures. Do not patch unrelated rules or commit unrelated RSPEC refreshes to make CI pass.
- Rules use ESLint's visitor pattern. When relevant types or conditions are unknown, do not report an issue. Use the [central file classification](docs/file-classification.md) rather than classifying files in a rule.
- Check [`package.json`](package.json), [`pom.xml`](pom.xml), [Windows guidance](docs/windows.md) and the [SonarQube version matrix](docs/SONARQUBE_VERSION_MATRIX.md) before changing runtime support. ESLint peer versions are in [`.pmgrc.toml`](.pmgrc.toml).
- Treat the custom-rules API and published ESLint rule keys, names and options as public interfaces. Record changes in the [custom-rules API changelog](docs/custom-rules/CUSTOM_RULES_API_CHANGELOG.md) or the [ESLint rules changelog](packages/analysis/src/jsts/rules/CHANGELOG.md), respectively.
- Keep the docs up to date when changing build processes or workflows. Leave the Marketing-owned block in [`README.md`](README.md) unchanged unless coordinated with its owners.

## Documentation

- Before changing the build, read the [build guide](docs/BUILD.md) and [build skill](.claude/skills/build/SKILL.md). Before changing CI, read the [CI guide](docs/CI.md). For development setup, see [DEV.md](docs/DEV.md).
- Before working on rules, read the [rule development guidelines](.claude/rules.md). For specific tasks, use the skills for [new rules](.claude/skills/new-rule/SKILL.md), [implementation](.claude/skills/rule-implementation/SKILL.md), [options](.claude/skills/rule-options/SKILL.md), [helpers](.claude/skills/helpers/SKILL.md), [rule tests](.claude/skills/test-rule/SKILL.md), [test helpers](.claude/skills/tests/SKILL.md), [test quality](.claude/skills/test-quality-standards/SKILL.md) or [ruling](.claude/skills/ruling/SKILL.md).
- Before changing file discovery, read [file stores](docs/file-stores.md); before changing caching, read [Node analysis caches](docs/node-analysis-caches.md) and [Sonar cache](docs/sonar-cache.md). Before changing the custom-rules API, read [ESLint hooks](docs/custom-rules/ESLINT_HOOKS.md).

## Escalation and verification

See [CODEOWNERS](.github/CODEOWNERS) for ownership. Run the relevant checks for the component you changed and the Vortex analysis below before handing off. If credentials or a required service are unavailable, report the check as not run, not passed.

## External context

Rule specifications live in [RSPEC](https://github.com/SonarSource/rspec), and ruling sources are in the `its/sources` submodule. Use the [Sonar documentation skill](.claude/skills/sonar-docs/SKILL.md) for product documentation.

<!-- prettier-ignore-start -->

<!-- sonar:begin:sonarqube-agentic-analysis-protocol -->
# Vortex analysis protocol

Vortex analysis is the final confirmation layer at the end of every turn in which you wrote to one or more files in the workspace (create, edit, patch, format — any tool call that changed file contents on disk).

**Trigger:** the moment before you send your final reply for the turn.

When the trigger fires, you **MUST** run Vortex analysis on the full set of files you modified this turn — **one command, not a per-file loop**.

**Preferred:** pass every path you modified this turn in a single invocation (repeat `--file` for each path). Use paths **relative to the project root** (e.g. `src/foo.ts`). For end-of-turn analysis, **always** pass `--depth DEEP` — even when you changed only one file — so cross-file findings are included.

```bash
sonar analyze agentic --project org.sonarsource.javascript:javascript --depth DEEP --file <path/to/file1> --file <path/to/file2>
```

**Fallback:** when you cannot reliably list every modified path (e.g. you did not track them, or git state is the only source of truth), use the git change set with DEEP analysis:

```bash
sonar analyze agentic --project org.sonarsource.javascript:javascript --depth DEEP
```

Per-edit hooks run faster STANDARD analysis. End-of-turn analysis must always use `--depth DEEP` (including a single `--file`). Use `--depth STANDARD` only for optional faster passes — never for the mandatory end-of-turn run.

Non-negotiable rules:

1. Mid-turn edits do **not** need Vortex analysis — only the final on-disk state matters. Skipping Vortex analysis at end-of-turn is a protocol violation.
2. Run Vortex analysis **before** sending your final reply, marking the task done, or handing control back to the user.
3. If Vortex analysis reports issues on lines you touched in this turn, fix them, then re-run Vortex analysis on the same scope (change set or explicit file list). Repeat until clean (or only pre-existing findings on lines you did not touch remain). Pre-existing findings on untouched lines are out of scope — do not "fix" them unless the user asked.
4. If Vortex analysis is skipped (no SonarQube Cloud connection, or no project configured), state the skip reason to the user once and continue — do not retry.
5. Do not suppress, summarize away, or omit Vortex analysis findings from your reply. Surface them verbatim.
<!-- sonar:end:sonarqube-agentic-analysis-protocol -->

<!-- prettier-ignore-end -->
