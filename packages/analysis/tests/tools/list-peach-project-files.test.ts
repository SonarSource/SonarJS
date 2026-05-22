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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { classifyRelativePath, type SonarProperties } from '../../src/common/project-file-scope.js';

function createProperties(entries: Record<string, string>): SonarProperties {
  return new Map(Object.entries(entries));
}

describe('list peach project files helper', () => {
  it('classifies in-scope source files as MAIN', () => {
    const classification = classifyRelativePath(
      '/project/workspace',
      createProperties({
        'sonar.sources': 'packages/server',
      }),
      'packages/server/src/plugin/schemaReporting/generated/operations.ts',
    );

    expect(classification.status).toBe('MAIN');
  });

  it('classifies files outside sonar.sources as outside scope', () => {
    const classification = classifyRelativePath(
      '/project/workspace',
      createProperties({
        'sonar.sources': 'packages/fxa-auth-server/lib',
      }),
      'libs/shared/cms/src/__generated__/graphql.ts',
    );

    expect(classification.status).toBe('OUTSIDE_SONAR_PATHS');
  });

  it('classifies files excluded by sonar.exclusions as excluded by scan settings', () => {
    const classification = classifyRelativePath(
      '/project/workspace',
      createProperties({
        'sonar.sources': '.',
        'sonar.exclusions': '**/generated.ts,**/generated/**',
      }),
      'packages/indexer/gql/generated/graphql.ts',
    );

    expect(classification.status).toBe('EXCLUDED_BY_SCAN_SETTINGS');
  });

  it('classifies .d.ts files excluded by default JS/TS exclusions as excluded by scan settings', () => {
    const classification = classifyRelativePath(
      '/project/workspace',
      createProperties({
        'sonar.sources': 'packages/server',
      }),
      'packages/server/src/plugin/schemaReporting/generated/operations.d.ts',
    );

    expect(classification.status).toBe('EXCLUDED_BY_SCAN_SETTINGS');
  });
});
