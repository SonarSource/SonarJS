---
name: peach-local-scan
description: Use when the user wants to scan one or more Peach projects from a local peachee-js checkout against Nigel local SonarQube with a locally built or existing SonarJS analyzer, analyzer-state inspection/restoration, host-based scanning, debug logging, and mandatory issue retrieval.
allowed-tools: Bash(bash:*), Bash(curl:*), Bash(docker:*), Bash(find:*), Bash(grep:*), Bash(jq:*), Bash(node:*), Bash(npm:*), Bash(sed --sandbox:*), Read, Agent
---

# Peach Local Scan

Canonical instructions for this skill live in `.claude/skills/peach-local-scan/INSTRUCTIONS.md`
relative to the SonarJS repository root.

Before doing anything else:

1. Read `.claude/skills/peach-local-scan/INSTRUCTIONS.md`.
2. Follow that file verbatim.
3. Treat `.claude/skills/peach-local-scan/fetch-local-issues.js` as the canonical CE-polling
   local-issues helper for this skill.
4. Treat `.claude/skills/peach-local-scan/manage-local-analyzer.sh` as the canonical analyzer
   inspection/patch/restore helper for this skill.
5. Reuse `.claude/skills/build/SKILL.md` when the user wants to rebuild the analyzer.

Do not duplicate or fork the instructions in this wrapper.
