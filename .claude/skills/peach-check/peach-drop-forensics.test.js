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

import { runDropForensics } from './peach-drop-forensics.js';

function createSarifRun(projectKey, results) {
  return {
    version: '2.1.0',
    runs: [
      {
        properties: {
          project: projectKey,
        },
        results,
      },
    ],
  };
}

function createResult(ruleId, baselineState, path) {
  return {
    ruleId,
    baselineState,
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

test('runDropForensics falls back to the first SARIF candidate with project results and diagnoses test scope reclassification', async () => {
  const output = {};
  const currentSarifPath = '/tmp/current.sarif';
  const previousSarifPath = '/tmp/previous.sarif';

  await runDropForensics(
    {
      projectKey: 'js:angular-realworld-example-app',
      sourceJobName: 'angular-realworld-example-app',
      peacheeRoot: '/tmp/peachee-js',
      outputPath: '/tmp/drop.json',
      sarifPaths: [currentSarifPath, previousSarifPath],
    },
    {
      readFileSync: filePath => {
        if (filePath === currentSarifPath) {
          return JSON.stringify(createSarifRun('js:angular-realworld-example-app', []));
        }

        if (filePath === previousSarifPath) {
          return JSON.stringify(
            createSarifRun('js:angular-realworld-example-app', [
              createResult('typescript:S1537', 'absent', 'e2e/error-handling.spec.ts'),
              createResult(
                'typescript:S2699',
                'new',
                'src/app/features/article/services/comments.service.spec.ts',
              ),
              createResult('typescript:S5914', 'new', 'src/app/features/profile/services/profile.service.spec.ts'),
            ]),
          );
        }

        if (
          filePath ===
          '/tmp/peachee-js/angular-realworld-example-app/sonar-project.properties'
        ) {
          return ['sonar.projectKey=js:angular-realworld-example-app', 'sonar.sources=.', ''].join(
            '\n',
          );
        }

        throw new Error(`unexpected read: ${filePath}`);
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      existsSync: filePath =>
        filePath === '/tmp/peachee-js/angular-realworld-example-app/sonar-project.properties',
    },
  );

  const report = JSON.parse(output['/tmp/drop.json']);
  assert.equal(report.selected_sarif_path, previousSarifPath);
  assert.deepEqual(report.counts_by_baseline_state, { absent: 1, new: 2 });
  assert.deepEqual(report.test_like_counts_by_baseline_state, { absent: 1, new: 2 });
  assert.deepEqual(report.non_test_like_counts_by_baseline_state, {});
  assert.equal(report.project_metadata.project_dir, 'angular-realworld-example-app');
  assert.equal(report.project_metadata.has_sonar_tests, false);
  assert.deepEqual(report.project_metadata.sonar_sources, ['.']);
  assert.deepEqual(report.project_metadata.sonar_tests, []);
  assert.equal(report.diagnosis.id, 'LIKELY_TEST_SCOPE_RECLASSIFICATION');
});
