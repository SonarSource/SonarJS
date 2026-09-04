# Release Guide

The automated SonarJS analyzer release publishes the standard SonarQube plugin. SonarQube Server,
SonarQube Cloud, and SQAA all consume that same released plugin version; SQAA does not have a
separate release artifact.

`SQAA` is the current name for what older documentation and repository names still call `A3S`.

## Standard SonarQube Analyzer Release

### Entry points

1. Start `.github/workflows/automated-release.yml`.
2. That workflow orchestrates the release and calls `.github/workflows/release.yml` for artifact
   publication.
3. After the release succeeds, `.github/workflows/bump-versions.yml` opens the next development
   iteration PR.

### What `.github/workflows/automated-release.yml` does

The SonarJS workflow is a thin wrapper around
`SonarSource/release-github-actions/.github/workflows/automated-release.yml@v1` with SonarJS-specific
inputs:

- project name `SonarJS`
- plugin name `javascript`
- Jira project `JS`
- optional SQC, SQS, and SQAA integration PRs
- SQAA artifact name `js`, which maps to the `sonar-js` version in
  `sonar-analysis-as-a-service/gradle/sonar-plugins.versions.toml`
- SLVS, SLVSCODE, SLE, and SLI integration tickets enabled

The reusable workflow performs the following steps:

1. Freeze the target branch.
2. Run the releasability checks with `SonarSource/gh-action_releasability@v3`.
3. Resolve the release version with `get-release-version`.
4. Resolve the Jira version with `get-jira-version`.
5. Generate Jira-based release notes with `get-jira-release-notes` unless explicit notes were
   provided.
6. Create the REL Jira ticket with `create-jira-release-ticket`.
7. Publish the GitHub release with `publish-github-release`.
8. Unfreeze the branch.
9. Release the Jira version, create the next Jira version, and move the REL ticket to
   `Technical Release Done`.
10. Create integration tickets.
11. Open analyzer update PRs for SQS and SQC.
12. When both SQC and SQAA integration are enabled, open a PR in
    `SonarSource/sonar-analysis-as-a-service` that updates the full `sonar-js` plugin version.

### What `publish-github-release` does in practice

`SonarSource/release-github-actions/publish-github-release` is the handoff from orchestration to
artifact publication:

1. It creates or reuses a draft GitHub release for the target version.
2. It can attach Repox artifacts to that release if artifact paths were provided.
3. It inspects `.github/workflows/release.yml` and detects that SonarJS uses the
   `gh-action_release` v7 draft-first flow.
4. It triggers `.github/workflows/release.yml` with `version=<release-version>` and
   `dryRun=<draft flag>`.
5. It waits for that workflow to finish and fails the orchestration run if publication fails.

### What `.github/workflows/release.yml` does

`release.yml` publishes the standard analyzer artifacts through
`SonarSource/gh-action_release/.github/workflows/main.yaml@7.4.0` with:

- `publishToBinaries: true`
- `mavenCentralSync: true`
- the release version
- the dry-run flag

The reusable workflow follows the v7 draft-first release model:

1. Create or reuse the draft GitHub release.
2. Run releasability checks again inside the publication workflow.
3. Load Vault secrets and execute `./gh-action_release/main`.
4. Publish the release artifacts to the standard release targets.
5. Sync Maven Central.
6. Publish the draft GitHub release.
7. Push release telemetry to Datadog.

Because this is a draft-first flow, failures after the draft release exists are normally retried by
rerunning the workflow. Do not create a new release version solely because one publication attempt
failed.

### What `.github/workflows/bump-versions.yml` does

SonarJS does not use the generic `release-github-actions` version bump action. After the automated
release job finishes, SonarJS runs its own reusable workflow:

1. Check out the repository.
2. Update the root `pom.xml` `<revision>` to `${version}-SNAPSHOT`.
3. Open a PR with `peter-evans/create-pull-request@v8` titled
   `Prepare next development iteration`.

## SQAA Integration

SQAA uses the standard `sonar-javascript-plugin` artifact. SonarJS no longer builds or publishes a
separate SQAA Docker image.

When `sqaa-integration` is enabled together with `sqc-integration`, the shared automated-release
workflow:

1. Uses the full released SonarJS version in `X.Y.Z.BuildNumber` format.
2. Resolves the configured SQAA artifact name `js` to the `sonar-js` entry in
   `gradle/sonar-plugins.versions.toml` in `SonarSource/sonar-analysis-as-a-service`.
3. Opens a PR that updates that version entry.

After that PR is merged, `sonar-analysis-as-a-service` resolves the released
`org.sonarsource.javascript:sonar-javascript-plugin` artifact. The plugin contains the Node.js bridge
used by the SQAA mutualized analysis service, keeping the Java sensor and Node.js bridge on the same
released version.

## Release Checklist

1. Run `.github/workflows/automated-release.yml`, usually from `master`.
2. Monitor the GitHub release publication kicked off through `.github/workflows/release.yml`.
3. Verify the REL ticket and Jira release were updated.
4. Verify that the promoted `sonar-javascript-plugin-<version>-cyclonedx.json` classifier is
   present, signed, valid, and contains `pkg:npm` components.
5. If SQAA integration was enabled, verify that the `sonar-analysis-as-a-service` PR updates only
   the `sonar-js` entry to the full released version.
6. Merge the `Prepare next development iteration` PR.
7. Merge the SQS, SQC, and SQAA integration PRs created by the release automation.
