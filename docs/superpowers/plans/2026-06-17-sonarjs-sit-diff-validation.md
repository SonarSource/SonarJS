# SonarJS SIT Diff Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a temporary `S5759` canary that produces a real SIT/DiffSIT delta, keep unit and ruling expectations coherent, and create a heartbeat automation that autonomously progresses PR #7307 until SIT diff reporting is proven or externally blocked.

**Architecture:** The canary stays isolated in one revert-friendly commit by weakening only the `http-proxy.createProxyServer` path in `S5759`, while preserving the `createProxyMiddleware` path so the rule still has unit-test coverage. The CI monitor is a thread heartbeat, not a detached cron job, so it can reuse thread context, push bounded fixes, and report state back into this conversation.

**Tech Stack:** SonarJS TypeScript rule implementation and tests, custom-jsts ruling expectations, GitHub CLI for PR/check/thread actions, Codex heartbeat automation.

---

### Task 1: Add the `S5759` SIT canary with unit-test-first changes

**Files:**

- Modify: `packages/analysis/src/jsts/rules/S5759/unit.test.ts`
- Modify: `packages/analysis/src/jsts/rules/S5759/rule.ts`
- Delete: `its/ruling/src/test/expected/custom-jsts/javascript-S5759.json`

- [ ] **Step 1: Rewrite the unit test so the two `createProxyServer` cases become valid and only the middleware case remains invalid**

Replace the relevant parts of `packages/analysis/src/jsts/rules/S5759/unit.test.ts` with:

```ts
      valid: [
        {
          code: `
      const httpProxy = require('http-proxy')
      httpProxy.createProxyServer({target: 'http://localhost:9000'})`,
        },
        {
          code: `
      const httpProxy = require('http-proxy')
      httpProxy.other({target: 'http://localhost:9000'})`,
        },
        {
          code: `
      const httpProxy = require('http-proxy')
      httpProxy.createProxyServer()`,
        },
        {
          code: `
      const { createProxyServer } = require('other')
      createProxyServer({xfwd: true})`,
        },
        {
          code: `
      const { createProxyMiddleware } = require('http-proxy-middleware');
      createProxyMiddleware({ target: 'http://localhost:9000', changeOrigin: true});`,
        },
        {
          code: `
      createProxyServer({xfwd: true});
      createProxyMiddleware({ target: 'http://localhost:9000', changeOrigin: true, xfwd: true });`,
        },
        {
          code: `
      const httpProxy = require('http-proxy')
      httpProxy.createProxyServer({target: 'http://localhost:9000', xfwd: true})`,
        },
        {
          code: `
      const { createProxyServer } = require('http-proxy')
      createProxyServer({target: 'http://localhost:9000', xfwd: true})`,
        },
      ],
      invalid: [
        {
          code: `
      const { createProxyMiddleware } = require('http-proxy-middleware');
      createProxyMiddleware({ target: 'http://localhost:9000', changeOrigin: true, xfwd: true });`,
          errors: 1,
        },
      ],
```

- [ ] **Step 2: Run the `S5759` unit test and confirm it fails before the rule change**

Run:

```bash
./run-node node_modules/.bin/tsx --tsconfig packages/tsconfig.test.json --test packages/analysis/src/jsts/rules/S5759/unit.test.ts
```

Expected: `fail 1` because `S5759` still reports the two `createProxyServer` cases that were moved to `valid`.

- [ ] **Step 3: Change the rule so only `createProxyMiddleware` is treated as sensitive**

Update `packages/analysis/src/jsts/rules/S5759/rule.ts` to:

```ts
function isSensitiveFQN(context: Rule.RuleContext, call: estree.CallExpression) {
  const fqn = getFullyQualifiedName(context, call);
  return fqn === 'http-proxy-middleware.createProxyMiddleware';
}
```

This is the full implementation change for the canary. Do not refactor anything else in the rule.

- [ ] **Step 4: Re-run the `S5759` unit test and confirm it passes**

Run:

```bash
./run-node node_modules/.bin/tsx --tsconfig packages/tsconfig.test.json --test packages/analysis/src/jsts/rules/S5759/unit.test.ts
```

Expected: `pass 1`, `fail 0`.

- [ ] **Step 5: Delete the now-obsolete custom-jsts ruling expectation file**

Delete:

```text
its/ruling/src/test/expected/custom-jsts/javascript-S5759.json
```

Reason: the ruling writer skips empty outputs, so a zero-issue expectation must be represented by the file being absent, not by an empty JSON object/file.

- [ ] **Step 6: Verify formatting and the exact branch-local canary surface**

Run:

```bash
./run-node node_modules/.bin/prettier --check packages/analysis/src/jsts/rules/S5759/rule.ts packages/analysis/src/jsts/rules/S5759/unit.test.ts
git diff -- packages/analysis/src/jsts/rules/S5759/rule.ts packages/analysis/src/jsts/rules/S5759/unit.test.ts its/ruling/src/test/expected/custom-jsts/javascript-S5759.json
```

Expected:

- Prettier reports `All matched files use Prettier code style!`
- Diff shows only the temporary `S5759` rule change, the unit-test update, and deletion of `javascript-S5759.json`

- [ ] **Step 7: Prove the last commit will trigger SIT changed-rule detection**

After committing the canary in Task 2, run:

```bash
./run-node node_modules/.bin/tsx tools/sit/detect-changed-rules.ts --base HEAD~1 --head HEAD
```

Expected output:

```json
[
  { "repository": "javascript", "language": "js", "ruleKey": "S5759" },
  { "repository": "typescript", "language": "ts", "ruleKey": "S5759" }
]
```

This is expected because `S5759` metadata declares `compatibleLanguages: ["js", "ts"]`, even though the custom-jsts ruling hit removed by the canary is JavaScript-only.

---

### Task 2: Commit and push the canary as a dedicated revert-friendly change

**Files:**

- Modify: `packages/analysis/src/jsts/rules/S5759/rule.ts`
- Modify: `packages/analysis/src/jsts/rules/S5759/unit.test.ts`
- Delete: `its/ruling/src/test/expected/custom-jsts/javascript-S5759.json`

- [ ] **Step 1: Stage only the canary files**

Run:

```bash
git add packages/analysis/src/jsts/rules/S5759/rule.ts packages/analysis/src/jsts/rules/S5759/unit.test.ts its/ruling/src/test/expected/custom-jsts/javascript-S5759.json
git diff --cached -- packages/analysis/src/jsts/rules/S5759/rule.ts packages/analysis/src/jsts/rules/S5759/unit.test.ts its/ruling/src/test/expected/custom-jsts/javascript-S5759.json
```

Expected: staged diff contains only the `S5759` canary and the ruling expectation deletion.

- [ ] **Step 2: Commit the canary**

Run:

```bash
PATH=/Users/nathan.soufflet/.local/share/mise/installs/node/24.14.1/bin:$PATH git commit -m "Temporarily relax S5759 for SIT validation"
```

Expected: one new commit on `sit-exporter-experiment`.

- [ ] **Step 3: Run changed-rule detection against the canary commit**

Run:

```bash
./run-node node_modules/.bin/tsx tools/sit/detect-changed-rules.ts --base HEAD~1 --head HEAD
```

Expected output:

```json
[
  { "repository": "javascript", "language": "js", "ruleKey": "S5759" },
  { "repository": "typescript", "language": "ts", "ruleKey": "S5759" }
]
```

- [ ] **Step 4: Push the canary commit**

Run:

```bash
git push -u origin sit-exporter-experiment
```

Expected: remote branch advances and PR #7307 now includes a real rule change that will exercise SIT export and DiffSIT.

---

### Task 3: Create the heartbeat automation that autonomously progresses PR #7307

**Files:**

- Create/Update outside repo: Codex heartbeat automation attached to this thread

- [ ] **Step 1: Create the heartbeat automation**

Use `codex_app.automation_update` with:

```json
{
  "mode": "create",
  "kind": "heartbeat",
  "destination": "thread",
  "name": "Monitor SonarJS SIT PR 7307",
  "rrule": "FREQ=MINUTELY;INTERVAL=10",
  "status": "ACTIVE",
  "prompt": "Monitor SonarJS PR #7307 on branch sit-exporter-experiment. The main goal is to ensure SIT diff reports are working correctly. On each wakeup: inspect current PR checks, inspect unresolved review threads, apply only the smallest branch-local fix needed to progress the PR, run focused verification for the exact fix, commit and push when verification passes, reply to and resolve review threads when the current branch already addresses them, and report actions and current status back into this thread. You may edit files, create commits, push commits, post GitHub thread replies, and resolve addressed threads. Do not force-push, rebase, merge, or perform unrelated refactors. Stop changing code and report here if blocked by external state, missing credentials, or unavailable upstream services."
}
```

- [ ] **Step 2: Verify the automation configuration**

Immediately view the created automation and confirm:

- kind is `heartbeat`
- destination is the current thread
- schedule is `FREQ=MINUTELY;INTERVAL=10`
- prompt includes the SIT-specific goal and the no-force-push/no-rebase boundaries

- [ ] **Step 3: Leave the automation active**

Do not pause or delete it after creation. It must remain active so the thread continues monitoring CI and advancing the branch autonomously.

---

### Task 4: Final verification and status handoff

**Files:**

- Verify: `packages/analysis/src/jsts/rules/S5759/rule.ts`
- Verify: `packages/analysis/src/jsts/rules/S5759/unit.test.ts`
- Verify deletion: `its/ruling/src/test/expected/custom-jsts/javascript-S5759.json`
- Verify automation: thread heartbeat config

- [ ] **Step 1: Confirm the branch state after the canary push**

Run:

```bash
git status --short --branch
git log --oneline -3
```

Expected:

- clean working tree
- latest commit is `Temporarily relax S5759 for SIT validation`

- [ ] **Step 2: Confirm the PR now contains a live SIT canary change**

Run:

```bash
gh pr view 7307 --json files
```

Expected: the PR file list includes:

- `packages/analysis/src/jsts/rules/S5759/rule.ts`
- `packages/analysis/src/jsts/rules/S5759/unit.test.ts`
- removal of `its/ruling/src/test/expected/custom-jsts/javascript-S5759.json`

- [ ] **Step 3: Report the exact canary behavior and revert strategy**

Use this summary in the final handoff:

```text
The branch now carries a temporary S5759 canary that removes the custom-jsts S5759 issue by no longer flagging http-proxy.createProxyServer with xfwd: true. Unit tests and ruling expectations were updated coherently, and the change lives in its own commit so it can be reverted cleanly before merge.
```

- [ ] **Step 4: Keep the automation responsible for follow-up**

State explicitly in the handoff that the heartbeat automation is active and owns:

- CI check monitoring
- bounded branch-local fixes
- commit/push cycles
- GitHub review-thread replies and resolution
