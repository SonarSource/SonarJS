---
name: peach-check
description: Use when checking whether a Peach Main Analysis run blocks a SonarJS release, or when a Peach run shows failed jobs or suspicious analysis-result variations such as issue-count drops.
allowed-tools: Bash(gh auth status:*), Bash(gh run list:*), Bash(gh api:*), Bash(mkdir:*), Bash(jq:*), Bash(sed --sandbox:*), Bash(node:*), Read, Agent
---

# Peach Main Analysis Check

Canonical instructions live in `.claude/skills/peach-check/INSTRUCTIONS.md` relative to the
SonarJS repository root; follow that file verbatim and treat
`.claude/skills/peach-check/peach-issue-history.js` as the canonical issue-history helper.

Do not duplicate or fork the instructions in this wrapper.
