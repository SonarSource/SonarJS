# Editing SonarQube Documentation for SonarJS

Use this skill when editing the SonarQube product documentation for JavaScript/TypeScript/CSS analysis. The documentation lives in a separate repo and must be updated across multiple product versions.

## Repository

- Repo: `SonarSource/sonarqube-documentation` (cloned at `../sonarqube-documentation`)
- Git config: set `core.autocrlf=input` (repo uses LF, Windows creates CRLF)

## JS/TS/CSS Doc Locations

The JS/TS/CSS page exists in multiple places:

- **Cloud**: `content-output/cloud/default/advanced-setup/languages/javascript-typescript-css.md`
- **Community**: `content-output/community/default/analyzing-source-code/languages/javascript-typescript-css.md`
- **Server** (versioned): `content-output/server/<version>/analyzing-source-code/languages/javascript-typescript-css.md`
  - Not all server versions have the same sections. Use `grep` to find which versions contain the section you need to edit.
  - As of Feb 2026, versions 10.7+ have the "TypeScript configuration" and "Troubleshooting" sections.
  - Older versions (9.8, 9.9, 10.0–10.6) have a different doc structure.

## Doc Format

- Markdown with GitBook conventions
- Headings use anchor tags: `#### Title <a href="#slug" id="slug"></a>`
- Code blocks use `css-79elbk` language tag in server/community versions, `json` or `log` in cloud
- Bullet lists use `*`
- Properties referenced with backtick-wrapped inline code

## Reusable Content

The repo supports reusable content via `{% include "<relative-path>" %}` directives:

- Reusable files live in `content-output/reusable-content/.gitbook/include/`
- Naming convention: `global-` (all products), `sqs-x.x` (specific server version), `sqcs` (cloud+server), `sqscb` (server+community)
- Example: `global-languages-jsts-<topic>.md`
- The cloud folder has an extra `default/` folder that affects relative paths
- Currently the JS/TS/CSS page does NOT use reusable content includes

## Commit Messages

Format: `<Jira-ticket-ID> <short description>` (e.g., `JS-1374 Add troubleshooting docs for pure JS projects`)

Use `No-Jira` if there's no ticket.

## Pull Requests

- All PRs must be reviewed by the Documentation squad
- If you're in the Product Division, assign the tech writer for your department/squad
- Use `unset GITHUB_TOKEN` before `gh` commands (the PAT env var doesn't have access to this repo; the `gho_` token from `gh auth` does)

## Cloud vs Server/Community Feature Parity

Some SonarJS features are only deployed on Cloud first. When documenting:

- Check if the feature/property exists on all products before adding it everywhere
- Cloud may have sections that server/community don't (e.g., "Orphan files" with `createTSProgramForOrphanFiles`)
- Always `git fetch origin main` before starting — local main can be stale

## Workflow

1. `cd ../sonarqube-documentation && git fetch origin main && git checkout -b <branch> origin/main`
2. Identify which files need changes (grep for the section across all versions)
3. Edit all relevant files — match each file's existing style (code block language tags may differ)
4. `git add <specific files>` (avoid `git add -A` — there are `.idea/` files to exclude)
5. Commit with Jira ticket format
6. `unset GITHUB_TOKEN && git push -u origin <branch>`
7. `unset GITHUB_TOKEN && gh pr create ...`
