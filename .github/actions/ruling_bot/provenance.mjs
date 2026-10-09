/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

// Canonical report provenance: dispatch values, accepted inputs, action bindings and retry docs.
// Updater aliases describe the same evidence before a fix PR/report destination is chosen.
export const provenanceDefinitions = {
  'pr-number': {
    description: 'PR receiving the ruling report',
    type: 'string',
    required: true,
    env: 'PR_NUMBER',
    value: (_ctx, reportPr) => reportPr,
    report: 'inputs.pr-number || github.event.pull_request.number',
    retry: '<original-pr-number>',
    updater: {
      description: 'Original PR number; empty for a branch run',
      required: false,
      default: '',
      caller: "github.event.pull_request.number || ''",
    },
  },
  'base-sha': {
    description: 'First parent of the tested merge, or tested branch commit',
    type: 'string',
    default: '',
    env: 'BASE_SHA',
    value: ctx => ctx.base || ctx.testedHead,
    retry: '<tested-merge-first-parent-sha>',
    updater: {
      name: 'tested-base-sha',
      description: 'First parent of the tested PR merge; empty for a branch run',
      env: 'TESTED_BASE_SHA',
      caller: 'needs.js_ts_ruling.outputs.tested-base-sha',
    },
  },
  'head-sha': {
    description: 'Exact tested commit; synthetic merge for a PR',
    type: 'string',
    required: true,
    env: 'HEAD_SHA',
    value: ctx => ctx.testedCommit,
    report: 'inputs.head-sha || github.sha',
    retry: '<tested-merge-sha>',
    updater: {
      name: 'tested-commit-sha',
      required: false,
      default: '',
      env: 'TESTED_COMMIT_SHA',
      expression: 'inputs.tested-commit-sha || github.sha',
    },
  },
  'run-id': {
    description: 'Originating Build run ID; empty for a raw PR event',
    type: 'string',
    default: '',
    env: 'BUILD_RUN_ID',
    value: ctx => ctx.runId,
    retry: '<build-run-id>',
  },
  'run-attempt': {
    description: 'Originating Build run attempt',
    type: 'string',
    default: '1',
    env: 'BUILD_RUN_ATTEMPT',
    value: ctx => ctx.runAttempt || undefined,
    retry: '<current-build-run-attempt>',
  },
  'ruling-failed': {
    description: 'Whether saved generated results must be applied',
    type: 'boolean',
    default: false,
    env: 'RULING_FAILED',
    value: ctx => ctx.failed,
    retry: 'true',
    updater: {
      required: true,
      default: undefined,
      caller: "needs.js_ts_ruling.outputs.ruling-results-saved == 'true'",
    },
  },
  'is-pull-request': {
    description: 'Whether the tested commit is a synthetic PR merge',
    type: 'boolean',
    default: false,
    env: 'IS_PULL_REQUEST',
    value: ctx => ctx.isPullRequest,
    report: "github.event_name == 'pull_request' || inputs.is-pull-request",
    retry: 'true',
    updater: {
      required: true,
      default: undefined,
      caller: "github.event_name == 'pull_request'",
    },
  },
  'fix-pr-url': {
    description: 'Fix PR link to show on the original PR',
    type: 'string',
    default: '',
    env: 'FIX_PR_URL',
    value: (_ctx, _reportPr, fixUrl) => fixUrl,
    retry: '<fix-pr-url>',
  },
  'target-ref': {
    description: 'Original branch tested by ruling',
    type: 'string',
    default: '',
    env: 'TARGET_REF',
    value: ctx => ctx.targetRef,
    report: 'inputs.target-ref || github.head_ref',
    retry: '<original-branch>',
    updater: {
      required: true,
      default: undefined,
      caller: 'github.head_ref || github.ref_name',
    },
  },
};

export function dispatchProvenance(
  ctx,
  reportPr,
  fixUrl = '',
  definitions = provenanceDefinitions,
) {
  return Object.fromEntries(
    Object.entries(definitions).map(([name, definition]) => [
      name,
      String(definition.value(ctx, reportPr, fixUrl) ?? definition.default ?? ''),
    ]),
  );
}

export function updaterInputDefinitions(definitions = provenanceDefinitions) {
  return {
    ...Object.fromEntries(
      Object.entries(definitions)
        .filter(([, definition]) => definition.updater)
        .map(([name, definition]) => [
          definition.updater.name || name,
          { ...definition, ...definition.updater },
        ]),
    ),
    // The feature head is distinct from head-sha, which names the synthetic tested merge.
    'tested-head-sha': {
      description: 'Original head commit whose code produced the ruling results',
      required: true,
      env: 'TESTED_HEAD_SHA',
      caller: 'github.event.pull_request.head.sha || github.sha',
    },
  };
}
