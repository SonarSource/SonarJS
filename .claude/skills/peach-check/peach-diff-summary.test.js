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
import test from 'node:test';
import assert from 'node:assert/strict';

import { main, runDiffSummary } from './peach-diff-summary.js';

function createResult(ruleId, baselineState, path, fileStatus) {
  return {
    ruleId,
    baselineState,
    properties: {
      fileStatus,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: path,
          },
        },
      },
    ],
  };
}

function createSarif(...runs) {
  return {
    version: '2.1.0',
    runs,
  };
}

function createRun(projectKey, results) {
  return {
    properties: {
      project: projectKey,
    },
    results,
  };
}

test('runDiffSummary summarizes SonarJS and non-SonarJS diffs from aggregated artifacts', async () => {
  const output = {};

  await runDiffSummary(
    {
      aggregatedSarifPath: '/tmp/aggregated.sarif',
      diffAppLogPath: '/tmp/diff-app.log',
      outputPath: '/tmp/diff-summary.json',
    },
    {
      readFileSync: filePath => {
        if (filePath === '/tmp/aggregated.sarif') {
          return JSON.stringify(
            createSarif(
              createRun('js:project-a', [
                createResult('javascript:S1244', 'new', 'src/a.js', 'UNCHANGED'),
                createResult('Web:S6840', 'absent', 'src/a.html', 'CHANGED'),
              ]),
              createRun('js:project-b', [
                createResult('pythonbugs:S2259', 'new', 'scripts/tool.py', 'UNCHANGED'),
              ]),
              createRun('js:project-c', [
                createResult('typescript:S1244', 'new', 'src/c.ts', 'CHANGED'),
                createResult('typescript:S4782', 'absent', 'src/c.ts', 'UNCHANGED'),
              ]),
            ),
          );
        }

        if (filePath === '/tmp/diff-app.log') {
          return [
            '[2026-06-05T03:44:05.039Z] [org.springframework.boot.SpringApplication] [main] [857] [ERROR] Application run failed',
            'com.sonarsource.diffval.diff.app.ExitDiffAppException: The difference is found for projects: project-a,project-b,project-c',
            'at com.sonarsource.diffval.diff.app.MultipleDiffRunner.run(MultipleDiffRunner.java:55)',
            '',
          ].join('\n');
        }

        throw new Error(`unexpected read: ${filePath}`);
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
    },
  );

  const report = JSON.parse(output['/tmp/diff-summary.json']);
  assert.equal(report.aggregated_sarif_path, '/tmp/aggregated.sarif');
  assert.equal(report.diff_app_log_path, '/tmp/diff-app.log');
  assert.deepEqual(report.changed_projects_from_log, ['project-a', 'project-b', 'project-c']);
  assert.equal(report.changed_projects_total_from_log, 3);
  assert.deepEqual(report.rule_repositories, {
    Web: 1,
    javascript: 1,
    pythonbugs: 1,
    typescript: 2,
  });
  assert.deepEqual(report.sonarjs_summary, {
    projects_with_changes: 2,
    projects_with_new_issues: 2,
    projects_with_absent_issues: 2,
    new_issues: 2,
    absent_issues: 2,
    new_issues_on_unchanged_files: 1,
    absent_issues_on_unchanged_files: 1,
    new_by_rule: {
      'javascript:S1244': 1,
      'typescript:S1244': 1,
    },
    absent_by_rule: {
      'Web:S6840': 1,
      'typescript:S4782': 1,
    },
    new_file_status_counts: {
      CHANGED: 1,
      UNCHANGED: 1,
    },
    absent_file_status_counts: {
      CHANGED: 1,
      UNCHANGED: 1,
    },
  });
  assert.deepEqual(report.non_sonarjs_summary, {
    projects_with_changes: 1,
    results: 1,
    by_rule_repository: {
      pythonbugs: 1,
    },
  });
  assert.deepEqual(report.projects, [
    {
      project_key: 'js:project-a',
      new_issues: 1,
      absent_issues: 1,
      new_issues_on_unchanged_files: 1,
      absent_issues_on_unchanged_files: 0,
      new_by_rule: {
        'javascript:S1244': 1,
      },
      absent_by_rule: {
        'Web:S6840': 1,
      },
      new_file_status_counts: {
        UNCHANGED: 1,
      },
      absent_file_status_counts: {
        CHANGED: 1,
      },
      non_sonarjs_results: 0,
      non_sonarjs_by_rule_repository: {},
    },
    {
      project_key: 'js:project-c',
      new_issues: 1,
      absent_issues: 1,
      new_issues_on_unchanged_files: 0,
      absent_issues_on_unchanged_files: 1,
      new_by_rule: {
        'typescript:S1244': 1,
      },
      absent_by_rule: {
        'typescript:S4782': 1,
      },
      new_file_status_counts: {
        CHANGED: 1,
      },
      absent_file_status_counts: {
        UNCHANGED: 1,
      },
      non_sonarjs_results: 0,
      non_sonarjs_by_rule_repository: {},
    },
    {
      project_key: 'js:project-b',
      new_issues: 0,
      absent_issues: 0,
      new_issues_on_unchanged_files: 0,
      absent_issues_on_unchanged_files: 0,
      new_by_rule: {},
      absent_by_rule: {},
      new_file_status_counts: {},
      absent_file_status_counts: {},
      non_sonarjs_results: 1,
      non_sonarjs_by_rule_repository: {
        pythonbugs: 1,
      },
    },
  ]);
});

test('main prints concise progress lines for CLI use', async () => {
  const logLines = [];

  await main(['/tmp/aggregated.sarif', '/tmp/diff-summary.json', '/tmp/diff-app.log'], {
    log: message => {
      logLines.push(message);
    },
    runDiffSummary: async () => ({}),
  });

  assert.deepEqual(logLines, [
    'peach-diff-summary: starting /tmp/aggregated.sarif -> /tmp/diff-summary.json',
    'peach-diff-summary: wrote /tmp/diff-summary.json',
  ]);
});
