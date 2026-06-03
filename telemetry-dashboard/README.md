# SonarJS Telemetry Dashboard

Static site for exploring SonarJS analyzer telemetry from Redshift.

## What it does

- Discovers telemetry columns directly from the SonarJS adhoc warehouse views
- Deduplicates to the latest analysis per `project_uuid` over a configurable window
- Builds a static dashboard that renders new telemetry fields automatically
- Uses untracked local snapshots or CI-fetched snapshots instead of committed telemetry data

## Local usage

```bash
cd telemetry-dashboard
npm ci
npm run build
```

This writes the static site to `telemetry-dashboard/dist`.

If `data/latest.json` is not present yet, the build still succeeds and emits an empty placeholder snapshot with instructions in the UI.

To fetch fresh data from Redshift first:

```bash
npm run fetch:redshift
npm run build
```

The fetch script follows the same Redshift auth pattern as `issue-feedback-dashboard`:

- In CI, it uses `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN`
- Locally, it can fall back to the JumpCloud SAML login flow and cached Redshift credentials

Useful environment variables:

- `TELEMETRY_WINDOW_DAYS`: rolling dedup window, defaults to `21`
- `TELEMETRY_TOP_VALUES_LIMIT`: max distinct values stored per field, defaults to `24`

## Deployment

The GitHub Actions workflow is expected to:

1. Configure Node and install `telemetry-dashboard` dependencies
2. Assume the Redshift CI role
3. Run `npm --prefix telemetry-dashboard run fetch:redshift`
4. Run `npm --prefix telemetry-dashboard run build`
5. Deploy `telemetry-dashboard/dist` to `gh_pages`

The workflow assumes `SonarJSTelemetryDashboardRedshiftRole` from the Data Team prod account
through GitHub OIDC, following the same deployment model as `issue-feedback-dashboard`.
