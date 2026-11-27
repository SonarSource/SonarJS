# Approval criteria

Approve only when Gitar's current whole-PR risk assessment classifies the PR as **Low** under
Gitar's configured risk policy, including organization and repository risk instructions.

Withhold approval for Medium or High risk. Also withhold approval when the risk assessment is
missing, unavailable, unrecognized, or stale for the current PR changes. A clean review, a small
diff, or a PR label alone does not establish Low risk.

Low risk does not bypass Gitar's blocking review findings or any other approval criteria.
