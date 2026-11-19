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
import { beforeEach, describe, it } from 'node:test';
import { expect } from 'expect';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type ts from 'typescript';
import type { RuleConfig } from '../src/jsts/linter/config/rule-config.js';
import { withNodeModuleJsDepth } from '../src/jsts/program/tsconfig/node-module-depth.js';
import {
  createProgramOptions,
  createProgramOptionsFromJson,
} from '../src/jsts/program/tsconfig/options.js';
import { clearProgramOptionsCache } from '../src/jsts/program/cache/programOptionsCache.js';
import { createConfigurationFromInput } from '../src/common/configuration.js';
import {
  initFileStoresForAnalysis,
  sourceFileStore,
  tsConfigStore,
} from '../src/file-stores/index.js';
import { sanitizeInputFiles } from '../src/common/input-sanitize.js';
import { analyzeProject } from '../src/analyzeProject.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { Linter } from '../src/jsts/linter/linter.js';
import { ProgramSelectionArchive } from '../src/program-selection/archive.js';

const rule: RuleConfig = {
  key: 'S1116',
  configurations: [],
  fileTypeTargets: ['MAIN', 'TEST'],
  language: 'js',
  analysisModes: ['DEFAULT'],
};

describe('analysis-level node_modules inference depth', () => {
  beforeEach(() => {
    tsConfigStore.clearCache();
    sourceFileStore.clearCache();
    clearProgramOptionsCache();
  });

  it('overrides cached tsconfig options without leaking into the next disabled analysis', () => {
    const tsconfig = normalizeToAbsolutePath(path.join(process.cwd(), 'depth-test.json'));
    const original = createProgramOptions(
      tsconfig,
      '{"compilerOptions":{"maxNodeModuleJsDepth":9},"files":["depth.js"]}',
      true,
    );
    const enabled = withNodeModuleJsDepth(original, 4);
    expect(enabled.options.maxNodeModuleJsDepth).toBe(4);
    expect(enabled.options).not.toBe(original.options);
    const cached = createProgramOptions(
      tsconfig,
      '{"compilerOptions":{"maxNodeModuleJsDepth":9},"files":["depth.js"]}',
      true,
    );
    expect(cached).toBe(original);
    expect(withNodeModuleJsDepth(cached, undefined).options.maxNodeModuleJsDepth).toBe(9);
    expect(
      withNodeModuleJsDepth(createProgramOptionsFromJson({}, [], process.cwd()), undefined).options
        .maxNodeModuleJsDepth,
    ).toBeUndefined();
  });

  it('does not re-enable explicitly disabled type checking', async context => {
    const baseDir = normalizeToAbsolutePath(
      fs.mkdtempSync(path.join(os.tmpdir(), 'hook-depth-disabled-')),
    );
    context.after(() => fs.rmSync(baseDir, { recursive: true, force: true }));
    const filePath = normalizeToAbsolutePath('main.js', baseDir);
    fs.writeFileSync(filePath, 'const value = 1;;');
    const configuration = createConfigurationFromInput({
      baseDir,
      disableTypeChecking: true,
      maxNodeModuleJsDepth: 4,
    });
    const sanitized = await sanitizeInputFiles(
      { [filePath]: { filePath, fileType: 'MAIN' } },
      configuration,
    );
    await initFileStoresForAnalysis(configuration, sanitized.files);
    const programs: unknown[] = [];
    const lint = Linter.lint;
    context.mock.method(Linter, 'lint', (...args: Parameters<typeof Linter.lint>) => {
      programs.push(args[0].sourceCode.parserServices.program);
      return lint.apply(Linter, args);
    });
    await analyzeProject({ rules: [rule], bundles: [] }, configuration);
    expect(programs).toEqual([null]);
  });

  for (const scenario of [
    'configured',
    'orphan',
    'merged',
    'restored-configured',
    'restored-orphan',
    'sonarlint-configured',
  ] as const) {
    for (const maxNodeModuleJsDepth of [undefined, 0, 4]) {
      it(`${scenario}: applies analysis depth ${maxNodeModuleJsDepth}`, async context => {
        const baseDir = normalizeToAbsolutePath(
          fs.mkdtempSync(path.join(os.tmpdir(), 'hook-depth-')),
        );
        context.after(() => fs.rmSync(baseDir, { recursive: true, force: true }));
        const configured = !scenario.endsWith('orphan');
        const sonarlint = scenario === 'sonarlint-configured';
        const main = normalizeToAbsolutePath('main.js', baseDir);
        const orphan = normalizeToAbsolutePath('orphan.js', baseDir);
        fs.writeFileSync(main, 'const value = 1;;');
        if (configured) {
          fs.writeFileSync(
            path.join(baseDir, 'tsconfig.json'),
            JSON.stringify({
              compilerOptions: { allowJs: true, maxNodeModuleJsDepth: 1 },
              files: ['main.js'],
            }),
          );
        }
        if (scenario === 'merged') fs.writeFileSync(orphan, 'const other = 2;;');
        const inputFiles = Object.fromEntries(
          [main, ...(scenario === 'merged' ? [orphan] : [])].map(filePath => [
            filePath,
            { filePath, fileType: 'MAIN' as const },
          ]),
        );
        const initialize = async () => {
          const configuration = createConfigurationFromInput({
            baseDir,
            maxNodeModuleJsDepth,
            sonarlint,
          });
          const sanitized = await sanitizeInputFiles(inputFiles, configuration);
          await initFileStoresForAnalysis(configuration, sanitized.files);
          return configuration;
        };
        const input = { rules: [rule], bundles: [] };
        const configuration = await initialize();
        const archivePath = path.join(baseDir, 'selection.pb.gz');
        if (scenario.startsWith('restored')) {
          const archive = new ProgramSelectionArchive(archivePath, baseDir, 'record');
          await analyzeProject(
            { ...input, programSelection: archive },
            { ...configuration, maxNodeModuleJsDepth: maxNodeModuleJsDepth ? 2 : undefined },
          );
          archive.end();
          await initialize();
        }
        const observed: (number | undefined)[] = [];
        const lint = Linter.lint;
        context.mock.method(Linter, 'lint', (...args: Parameters<typeof Linter.lint>) => {
          const services = args[0].sourceCode.parserServices as { program?: ts.Program };
          observed.push(services.program?.getCompilerOptions().maxNodeModuleJsDepth);
          return lint.apply(Linter, args);
        });
        await analyzeProject(
          {
            ...input,
            ...(scenario.startsWith('restored')
              ? { programSelection: new ProgramSelectionArchive(archivePath, baseDir, 'replay') }
              : {}),
          },
          configuration,
        );
        expect(observed).toHaveLength(scenario === 'merged' ? 2 : 1);
        expect(observed).toEqual(
          Array(observed.length).fill(
            (!sonarlint && maxNodeModuleJsDepth) || (configured ? 1 : undefined),
          ),
        );
      });
    }
  }
});
