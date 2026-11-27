---
title: Keep changes reviewable
description: Check that reporting changes serve the PR purpose and have supporting evidence.
type: check
when: PRs that change SonarJS analysis or issue reporting
actions: Report unrelated reporting changes and request a rationale and focused regression evidence.
---

# Keep changes reviewable

Compare each reporting change with the PR's stated purpose in its title, description, and
linked issue. Inspect changes to issue detection, messages, primary and secondary locations,
quick fixes, and expected ruling results. A small diff can still change analysis behavior.

For a reporting change outside that purpose, identify the changed behavior and its path.
Request an explanation of why it is necessary and focused regression evidence that shows the
intended result and preserves existing behavior outside the requested change. An updated
snapshot or ruling expectation alone does not explain why a behavior change is correct.

If the behavior change is independent, recommend a separate PR. Do not silently expand the
current PR's scope or suggest reverting necessary supporting changes. Tests, fixtures,
generated metadata, and ruling expectations can span several files while supporting one
coherent fix. Check their purpose before treating them as unrelated.

If the PR's purpose is unclear, ask for clarification before declaring a reporting change out
of scope. Keep comments specific to observable behavior and actionable evidence.
