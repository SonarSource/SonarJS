---
name: peach-local-scan
description: Use when the user wants to scan one, several, or all peachee-js projects from a local peachee-js checkout against Nigel local SonarQube with a locally built or existing SonarJS analyzer, analyzer-state inspection/restoration, debug logging, and mandatory issue retrieval.
---

# Peach Local Scan

Canonical instructions live in `.claude/skills/peach-local-scan/INSTRUCTIONS.md` relative to
the SonarJS repository root. That workflow covers named project subsets and full sweeps of every
entry in `projects.json`.

Use that file verbatim. Treat `.claude/skills/peach-local-scan/fetch-local-issues.js` as the
canonical post-scan CE-polling and issue-fetch helper, treat
`.claude/skills/peach-local-scan/scan-report.js` as the canonical scan-report checkpoint and
summary helper, treat
`.claude/skills/peach-local-scan/manage-local-analyzer.sh` as the canonical analyzer
inspection/patch/restore helper, and reuse `.claude/skills/build/SKILL.md` rather than
duplicating analyzer build guidance when the user wants to rebuild the plugin.
