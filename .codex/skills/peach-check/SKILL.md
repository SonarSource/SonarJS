---
name: peach-check
description: Use as a daily Peach Main Analysis sanity check, before a SonarJS release, or when the Peach Main Analysis workflow on SonarSource/peachee-js needs triage for failed jobs or suspicious project issue-count drops.
argument-hint: "[run-id]"
---

# Peach Main Analysis Check

Canonical instructions live in `.claude/skills/peach-check/INSTRUCTIONS.md` relative to the
SonarJS repository root; follow that file verbatim and treat
`.claude/skills/peach-check/peach-run-jobs.js` as the canonical run-jobs helper,
`.claude/skills/peach-check/peach-issue-history.js` as the canonical issue-history helper, and
`.claude/skills/peach-check/peach-drop-forensics.js` as the canonical DROP-forensics helper.

Do not duplicate or fork the instructions in this wrapper.
