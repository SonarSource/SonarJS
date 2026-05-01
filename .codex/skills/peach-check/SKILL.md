---
name: peach-check
description: Use before a SonarJS release or when the Peach Main Analysis workflow on SonarSource/peachee-js shows failed jobs or suspicious project issue-count drops that need triage. Classify failed Peach jobs and flag likely project-configuration regressions using docs/peach-main-analysis.md.
allowed-tools: Bash(gh auth status:*), Bash(gh run list:*), Bash(gh api:*), Bash(mkdir:*), Bash(jq:*), Bash(sed --sandbox:*), Bash(node:*), Read, Agent
---

# Peach Main Analysis Check

Canonical instructions for this skill live in `.claude/skills/peach-check/INSTRUCTIONS.md`
relative to the SonarJS repository root.

Before doing anything else:

1. Read `.claude/skills/peach-check/INSTRUCTIONS.md`.
2. Follow that file verbatim.
3. Treat `.claude/skills/peach-check/peach-issue-history.js` as the canonical issue-history
   implementation for this skill.

Do not duplicate or fork the instructions in this wrapper.
