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
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { Linter } from '../../../src/jsts/linter/linter.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';
import {
  getProjectAnalysisTelemetry,
  resetProjectAnalysisTelemetry,
} from '../../../src/telemetry.js';

describe('Linter dependency and environment filtering', () => {
  const ecma2020 = 2020;
  const ecma2022 = 2022;

  it('should disable React-dependent rules on .vue files even when react dependency is present', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'react'),
    );
    await Linter.initialize({
      baseDir,
      rules: [
        {
          key: 'S100',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6440',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6477',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6749',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6770',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6790',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6747',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6957',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(baseDir, 'src', 'file.vue')),
      'MAIN',
      'DEFAULT',
      'js',
    );

    expect(rules).not.toHaveProperty('sonarjs/S6440');
    expect(rules).not.toHaveProperty('sonarjs/S6957');
    expect(rules).not.toHaveProperty('sonarjs/S6790');
    expect(rules).not.toHaveProperty('sonarjs/S6747');
    expect(rules).toHaveProperty('sonarjs/S6477');
    expect(rules).toHaveProperty('sonarjs/S6749');
    expect(rules).toHaveProperty('sonarjs/S6770');
    expect(rules).toHaveProperty('sonarjs/S100');
  });

  it('should merge deno and package.json dependencies for dependency filtering', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'deno-priority-no-react'),
    );
    await Linter.initialize({
      baseDir,
      rules: [
        {
          key: 'S6477',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(baseDir, 'src', 'file.jsx')),
      'MAIN',
      'DEFAULT',
      'js',
    );
    expect(rules).toHaveProperty('sonarjs/S6477');
  });

  it('should not force cognitive complexity metric rule by default', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
    });
    expect(
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({});
  });

  it('should keep S3776 options from quality profile', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S3776',
          configurations: [0],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    expect(
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({
      'sonarjs/S3776': ['error', 0],
    });
  });

  it('should disable rules whose requiredEcmaVersion exceeds the detected ES year', async () => {
    // S7755 (prefer-at) requires ES2022 - should be disabled when project is ES2020
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7755',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
      ecma2020,
    );
    expect(rules).not.toHaveProperty('sonarjs/S7755');
  });

  it('should enable rules whose requiredEcmaVersion matches the detected ES year', async () => {
    // S7755 requires ES2022 - should be enabled when project is exactly ES2022
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7755',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
      ecma2022,
    );
    expect(rules).toHaveProperty('sonarjs/S7755');
  });

  it('should enable all rules when detectedEsYear is undefined (esnext fallback)', async () => {
    // No ES year detected -> no restriction, all active rules should be enabled
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7755',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
      undefined,
    );
    expect(rules).toHaveProperty('sonarjs/S7755');
  });

  it('should disable rules whose requiredModuleType excludes detected module type', async () => {
    // S7785 requires ESM modules - should be disabled for explicit CommonJS files
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7785',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.cjs')),
      'MAIN',
      'DEFAULT',
      'js',
      ecma2022,
    );
    expect(rules).not.toHaveProperty('sonarjs/S7785');
  });

  it('should enable rules when requiredModuleType matches detected module type', async () => {
    // S7785 requires ESM modules - should be enabled for explicit ES modules
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7785',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.mjs')),
      'MAIN',
      'DEFAULT',
      'js',
      ecma2022,
    );
    expect(rules).toHaveProperty('sonarjs/S7785');
  });

  it('should not filter rules by module type when no module signal is available', async () => {
    // Unknown module type should keep rules enabled (same behavior as unknown ES version)
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7785',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
      ecma2022,
    );
    expect(rules).toHaveProperty('sonarjs/S7785');
  });

  it('should track module type telemetry during rule filtering', async () => {
    resetProjectAnalysisTelemetry();
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [],
    });

    Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.mjs')),
      'MAIN',
      'DEFAULT',
      'js',
    );
    Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.cjs')),
      'MAIN',
      'DEFAULT',
      'js',
    );
    Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
    );

    expect(getProjectAnalysisTelemetry()).toMatchObject({
      esmFileCount: 1,
      cjsFileCount: 1,
    });
  });

  it('should keep configured rules unchanged when only profile rules are set', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S100',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
      environments: [],
      globals: [],
    });
    expect(
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({
      'sonarjs/S100': [
        'error',
        {
          format: '^[_a-z][a-zA-Z0-9]*$',
        },
      ],
    });
  });
});
