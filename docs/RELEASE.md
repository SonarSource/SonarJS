# Release Guide

SonarJS currently has two distinct release targets:

| Target                      | Artifact                                   | Main workflow                             | Notes                                      |
| --------------------------- | ------------------------------------------ | ----------------------------------------- | ------------------------------------------ |
| Standard SonarQube analyzer | Maven/JAR release artifacts                | `.github/workflows/automated-release.yml` | This is the normal SonarJS release flow.   |
| SQAA (previously A3S)       | Docker image for `LanguageAnalyzerService` | `.github/workflows/docker-sqaa.yml`       | Manual SQAA-only entry point and fallback. |

## Terminology

- `SQAA` is the current name for what older docs and repository names still call `A3S`.
- Some external identifiers still keep the legacy `a3s` name for compatibility. The important ones are:
  - the Docker repository path `a3s/analysis/javascript`
  - `packages/grpc/src/proto/language_analyzer.proto` with `option java_package = "com.sonarsource.a3s.analyzer.grpc";`
- Do not rename those compatibility-sensitive identifiers as part of a routine release.

## Standard SonarQube Analyzer Release

This is the regular SonarJS analyzer release. It produces the standard SonarQube analyzer artifacts and can also automate the SQAA handoff using the same build number.

### Entry points

1. Start `.github/workflows/automated-release.yml`.
2. That workflow orchestrates the release and then calls `.github/workflows/release.yml` for the actual artifact publication.
3. After the release succeeds, `.github/workflows/bump-versions.yml` opens the next development iteration PR.

### What `.github/workflows/automated-release.yml` does

The SonarJS workflow is a thin wrapper around `SonarSource/release-github-actions/.github/workflows/automated-release.yml@v1` with SonarJS-specific inputs:

- project name `SonarJS`
- plugin name `javascript`
- Jira project `JS`
- optional SQC and SQS integration PRs
- optional SQAA integration, enabled in the SonarJS wrapper and implemented by a custom local workflow
- SLVS, SLVSCODE, SLE, and SLI integration tickets enabled
- the generic `release-github-actions` SQAA integration explicitly disabled, because SonarJS uses `analysis/js_ts_image_tag` instead of `gradle/sonar-plugins.versions.toml`

The reusable workflow performs the following steps:

1. Freeze the target branch.
2. Run the releasability checks with `SonarSource/gh-action_releasability@v3`.
3. Resolve the release version with `get-release-version`.
4. Resolve the Jira version with `get-jira-version`.
5. Generate Jira-based release notes with `get-jira-release-notes` unless explicit notes were provided.
6. Create the REL Jira ticket with `create-jira-release-ticket`.
7. Publish the GitHub release with `publish-github-release`.
8. Unfreeze the branch.
9. Release the Jira version, create the next Jira version, and move the REL ticket to `Technical Release Done`.
10. Create integration tickets.
11. Open analyzer update PRs for SQS and SQC.

After that reusable workflow succeeds, SonarJS runs a custom `sqaa_release` job that:

1. Reuses the released `X.Y.Z.BuildNumber` version from the standard release.
2. Extracts the Docker tag from the final `.BuildNumber` suffix.
3. Checks out the release tag `refs/tags/<release-version>` so the SQAA image is built from the exact released commit.
4. Runs the SQAA Docker build and push flow.
5. Opens the `sonar-analysis-as-a-service` PR that updates `analysis/js_ts_image_tag`.

The `Prepare next development iteration` PR waits for this SonarJS-specific SQAA automation to finish, so a failed SQAA handoff blocks the end of the automated release run.

### What `publish-github-release` does in practice

`SonarSource/release-github-actions/publish-github-release` is the handoff from orchestration to artifact publication:

1. It creates or reuses a draft GitHub release for the target version.
2. It can attach Repox artifacts to that release if artifact paths were provided.
3. It inspects `.github/workflows/release.yml` and detects that SonarJS uses the `gh-action_release` v7 draft-first flow.
4. It triggers `.github/workflows/release.yml` with `version=<release-version>` and `dryRun=<draft flag>`.
5. It waits for that workflow to finish and fails the orchestration run if the publication workflow fails.

### What `.github/workflows/release.yml` does

`release.yml` is the workflow that actually publishes the standard analyzer release artifacts. It calls `SonarSource/gh-action_release/.github/workflows/main.yaml@7.4.0` with:

- `publishToBinaries: true`
- `mavenCentralSync: true`
- the release version
- the dry-run flag

That reusable workflow follows the v7 draft-first release model:

1. Create or reuse the draft GitHub release.
2. Run releasability checks again inside the publication workflow.
3. Load Vault secrets and execute `./gh-action_release/main`.
4. Publish the release artifacts to the standard release targets.
5. Sync Maven Central.
6. Publish the draft GitHub release.
7. Push release telemetry to Datadog.

Because this is a draft-first flow, failures after the draft release exists are normally retried by rerunning the workflow. You do not create a new release version just because one publication attempt failed.

### What `.github/workflows/bump-versions.yml` does

SonarJS does **not** use the generic `release-github-actions` version bump action. Instead, after the automated release job finishes, SonarJS runs its own reusable workflow:

1. Check out the repository.
2. Update the root `pom.xml` `<revision>` to `${version}-SNAPSHOT`.
3. Open a PR with `peter-evans/create-pull-request@v8` titled `Prepare next development iteration`.

### Standard release checklist

1. Run `.github/workflows/automated-release.yml`, usually from `master`.
2. Monitor the GitHub release publication kicked off through `.github/workflows/release.yml`.
3. Verify the REL ticket and Jira release were updated.
4. If `sqaa-integration` was enabled, verify the SQAA Docker image was built from the release tag and that the `sonar-analysis-as-a-service` PR was created.
5. Merge the `Prepare next development iteration` PR.
6. Merge the SQS, SQC, and SQAA integration PRs created by the release automation.

## SQAA Release

SQAA (previously A3S) can be released in two ways:

- automatically from `.github/workflows/automated-release.yml`, reusing the standard release build number and release tag
- manually from `.github/workflows/docker-sqaa.yml` for SQAA-only rebuilds or exceptional reruns

In both cases, the SonarJS side only builds and publishes the Docker image to Repox. The deployment handoff happens afterwards in `SonarSource/sonar-analysis-as-a-service`.

### Artifact

The SQAA artifact is the Docker image built from the repository root `Dockerfile`.

Relevant implementation details:

- `npm run grpc:build` runs `bridge:build:fast` and then `grpc:bundle`
- `grpc:bundle` produces `bin/grpc-server.cjs`
- the Docker image copies `bin/` and starts `node ./bin/grpc-server.cjs 50051`
- the published image tag is the SonarJS build number

### SonarJS workflow

Run `.github/workflows/docker-sqaa.yml` manually when you need an SQAA-only build outside the standard automated release.

This workflow does the following:

1. Get a SonarJS build number with `SonarSource/ci-github-actions/get-build-number@master`.
2. Check out the requested branch.
3. Install toolchains with `jdx/mise-action@v4.2.0`:
   - Java 21
   - Maven 3.9
   - Node 24.11.0
4. Configure Maven with `SonarSource/ci-github-actions/config-maven@master`.
5. Configure npm with `SonarSource/ci-github-actions/config-npm@v1`.
6. Read Vault secrets:
   - Repox QA deployer credentials
   - RSPEC GitHub token
7. Run `npm ci`.
8. Refresh RSPEC rule data with `npm run rspec:refresh`.
9. Run `npm run grpc:build`.
10. Log in to `repox-sonarsource-docker-builds.jfrog.io`.
11. Build and push the Docker image with:

```bash
docker buildx build --platform linux/arm64 --tag "${DOCKER_IMAGE_BUILD_NUMBER}" --push .
```

The image is pushed to:

```text
repox-sonarsource-docker-builds.jfrog.io/a3s/analysis/javascript:<build_number>
```

The `a3s` repository segment is still intentional legacy naming. Do not change it during a routine SQAA release.

### SQAA automation from the standard release

When SQAA automation is enabled in `.github/workflows/automated-release.yml`:

1. The standard release produces a version in the format `X.Y.Z.BuildNumber`.
2. SonarJS reuses that exact `.BuildNumber` suffix for the SQAA Docker tag.
3. The SQAA image is built from the release tag `refs/tags/<release-version>`, not from the moving branch head.
4. The same run opens the `sonar-analysis-as-a-service` PR that updates `analysis/js_ts_image_tag`.

This keeps the Java artifacts and the SQAA Docker image on the same released commit and build number.

### Handoff to `sonar-analysis-as-a-service`

After the SonarJS workflow succeeds:

1. Take the SonarJS build number from the SQAA workflow run.
2. Open a PR in `SonarSource/sonar-analysis-as-a-service`, or let the automated release create it for you.
3. Update only `analysis/js_ts_image_tag` to that new build number.

Example:

- PR title: `SC-51805 Update JSTS analyzer to 42780`
- diff: `analysis/js_ts_image_tag` changed from `39440` to `42780`

### What happens after that PR is merged

In `SonarSource/sonar-analysis-as-a-service`:

1. `.github/workflows/build.yml` reads `analysis/js_ts_image_tag`.
2. It calls `.github/workflows/pull-and-push-analyzer-image.yml`.
3. That reusable workflow pulls:

```text
repox-sonarsource-docker-builds.jfrog.io/a3s/analysis/javascript:${source_tag}
```

4. It re-tags that image with the `sonar-analysis-as-a-service` build number and pushes it to ECR.
5. The merge to `master` also triggers `.github/workflows/master-deployment.yml`, which starts the deployment workflow for the environments.

### Important warning

Do **not** use the generic `SonarSource/release-github-actions/update-analysis-as-a-service` action for the SonarJS SQAA release.

That generic action updates `gradle/sonar-plugins.versions.toml` in `sonar-analysis-as-a-service`. The current JS/TS SQAA rollout does **not** use that file. The real SonarJS handoff is the PR that updates `analysis/js_ts_image_tag`, whether that PR is created automatically or manually.

### SQAA release checklist

1. For the normal release path, run `.github/workflows/automated-release.yml` with `sqaa-integration` enabled.
2. For a manual SQAA-only path, run `.github/workflows/docker-sqaa.yml`.
3. Note the SonarJS build number used as the Docker tag.
4. If the flow was manual, open a PR in `SonarSource/sonar-analysis-as-a-service` and update `analysis/js_ts_image_tag` to that build number.
5. Merge the PR to `master`.
6. Let `sonar-analysis-as-a-service` build and deployment workflows roll out the new image.
