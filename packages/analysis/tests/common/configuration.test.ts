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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installFsCache } from '../../../shared/src/fs-cache/hook.js';
import { setArchivedFileSystemCaseSensitivity } from '../../src/jsts/rules/helpers/filesystem-case.js';
import {
  createConfiguration,
  createConfigurationFromInput,
  getJsTsConfigFields,
  isAlsoCssFile,
  isAnalyzableFile,
  isHtmlFile,
  isYamlFile,
} from '../../src/common/configuration.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';

describe('createConfiguration', () => {
  for (const requestedMaxNodeModuleJsDepth of [undefined, 0, 1, 4, 8, 9, 10, 0x7fffffff]) {
    it(`preserves optional analysis node_modules depth ${requestedMaxNodeModuleJsDepth}`, () => {
      const input = { baseDir: '/path/to/project', requestedMaxNodeModuleJsDepth };
      for (const create of [createConfiguration, createConfigurationFromInput]) {
        const configuration = create(input);
        expect(configuration.requestedMaxNodeModuleJsDepth).toBe(requestedMaxNodeModuleJsDepth);
        expect(getJsTsConfigFields(configuration).requestedMaxNodeModuleJsDepth).toBe(
          requestedMaxNodeModuleJsDepth || undefined,
        );
      }
    });
  }

  it('rejects ambiguous custom dialects before returning a configuration', () => {
    expect(() =>
      createConfiguration({ baseDir: '/tmp', sassSuffixes: ['TXT'], lessSuffixes: ['.txt'] }),
    ).toThrow('CSS suffix .txt is configured for both less and sass');
  });

  it('discovers stylesheets only through the general suffix list', () => {
    const config = createConfiguration({
      baseDir: '/tmp',
      cssSuffixes: ['.css', '.custom-scss'],
      scssSuffixes: [' CUSTOM-SCSS ', '.custom-scss'],
      sassSuffixes: ['custom-sass'],
      lessSuffixes: ['.CUSTOM-LESS'],
    });
    expect(config.scssSuffixes).toEqual(['.custom-scss']);
    expect(config.cssSuffixes).toEqual(['.css', '.custom-scss']);
    for (const extension of ['custom-scss', 'custom-sass', 'custom-less']) {
      expect(isAnalyzableFile(normalizeToAbsolutePath(`/tmp/input.${extension}`), config)).toBe(
        extension === 'custom-scss',
      );
    }
  });

  it('uses the same stylesheet defaults as Java', () => {
    const config = createConfiguration({ baseDir: '/tmp' });
    const defaults = JSON.parse(
      fs.readFileSync(
        new URL(
          '../../../../sonar-plugin/css/src/test/resources/default-stylesheet-suffixes.json',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    expect(config).toMatchObject(defaults);
  });

  for (const dialect of ['css', 'scss', 'sass', 'less'] as const) {
    it(`does not restore defaults when ${dialect} suffixes are empty or replaced`, () => {
      for (const suffixes of [[], ['.custom']]) {
        const config = createConfiguration({ baseDir: '/tmp', [`${dialect}Suffixes`]: suffixes });
        expect(config[`${dialect}Suffixes`]).toEqual(suffixes);
        expect(isAnalyzableFile(normalizeToAbsolutePath(`/tmp/input.${dialect}`), config)).toBe(
          dialect !== 'css',
        );
        expect(isAnalyzableFile(normalizeToAbsolutePath('/tmp/input.custom'), config)).toBe(
          dialect === 'css' && suffixes.length > 0,
        );
      }
    });
  }

  for (const requestedMaxNodeModuleJsDepth of ['4', NaN, null, true, {}, []]) {
    it(`ignores nonnumeric optional analysis depth ${String(requestedMaxNodeModuleJsDepth)}`, () => {
      const configuration = createConfiguration({
        baseDir: '/path/to/project',
        requestedMaxNodeModuleJsDepth,
      });
      expect(configuration.requestedMaxNodeModuleJsDepth).toBeUndefined();
    });
  }

  it('leaves normal project defaults unchanged when analysis depth is omitted', () => {
    const configuration = createConfiguration({ baseDir: '/path/to/project' });
    expect(configuration.requestedMaxNodeModuleJsDepth).toBeUndefined();
    expect(configuration.disableTypeChecking).toBe(false);
    expect(configuration.createTSProgramForOrphanFiles).toBe(true);
  });

  it('does not apply analysis depth to SonarLint, including already constructed configurations', () => {
    const configuration = createConfiguration({
      baseDir: '/path/to/project',
      sonarlint: true,
      requestedMaxNodeModuleJsDepth: 4,
    });
    expect(configuration.requestedMaxNodeModuleJsDepth).toBe(4);
    expect(getJsTsConfigFields(configuration).requestedMaxNodeModuleJsDepth).toBeUndefined();
    expect(
      getJsTsConfigFields({ ...configuration, requestedMaxNodeModuleJsDepth: 6 })
        .requestedMaxNodeModuleJsDepth,
    ).toBeUndefined();
  });

  it('allows discovered suffixes to be associated with a preprocessor', () => {
    const config = createConfiguration({
      baseDir: '/tmp',
      cssSuffixes: [' TXT '],
      sassSuffixes: ['.txt'],
    });
    expect(config.cssSuffixes).toEqual(['.txt']);
    expect(config.sassSuffixes).toEqual(['.txt']);
  });

  it('disables standalone stylesheet discovery when the general list is empty', () => {
    const config = createConfiguration({ baseDir: '/tmp', cssSuffixes: [] });
    for (const extension of ['css', 'scss', 'sass', 'less']) {
      expect(isAnalyzableFile(normalizeToAbsolutePath(`/tmp/input.${extension}`), config)).toBe(
        false,
      );
    }
  });

  it('honors literal scanner directory exclusions without hardcoding a directory name', () => {
    const root = normalizeToAbsolutePath('/ci/project');
    const configuration = createConfiguration({
      baseDir: root,
      jsTsExclusions: [`directory:${root}/.build/[scanner]`, `directory:${root}/.literal/{a,b}`],
    });
    const excluded = (relative: string) =>
      configuration.jsTsExclusions.some(pattern =>
        pattern.match(normalizeToAbsolutePath(relative, root)),
      );
    expect(excluded('.build/[scanner]')).toBe(true);
    expect(excluded('.build/[scanner]/runtime.js')).toBe(true);
    expect(excluded('.build/s')).toBe(false);
    expect(excluded('.build/[scanner]-sources/source.js')).toBe(false);
    expect(excluded('.literal/{a,b}/runtime.js')).toBe(true);
    expect(excluded('.literal/a/runtime.js')).toBe(false);
    expect(createConfiguration({ baseDir: root, jsTsExclusions: [] }).jsTsExclusions).toEqual([]);
  });

  for (const caseSensitivePaths of [true, false]) {
    it(`matches generated directory exclusions with filesystem case sensitivity ${caseSensitivePaths}`, () => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-exclusions-'));
      const root = normalizeToAbsolutePath(temporary);
      const source = path.join(temporary, 'source.ts');
      fs.writeFileSync(source, 'const x = 1;');
      const installation = installFsCache();
      try {
        for (const mode of ['record', 'replay'] as const) {
          const session = installation.beginAnalysis({
            archivePath: path.join(temporary, 'fs.pb.gz'),
            rootDir: root,
            mode,
            // Replay must use the producer capability even when the consumer differs.
            caseSensitivePaths: mode === 'record' ? caseSensitivePaths : !caseSensitivePaths,
          });
          try {
            if (mode === 'record') {
              // Simulate the producer filesystem independently of the test host.
              setArchivedFileSystemCaseSensitivity(caseSensitivePaths);
            }
            expect(fs.readFileSync(source, 'utf8')).toBe('const x = 1;');
            const configuration = createConfiguration({
              baseDir: root,
              jsTsExclusions: [
                `directory:${root}/.build/Runtime`,
                '**/UserExcluded/**',
                `file:${root}/AbsoluteExcluded/**`,
              ],
            });
            const excluded = (relative: string) =>
              configuration.jsTsExclusions.some(pattern => pattern.match(`${root}/${relative}`));
            expect(excluded('.build/Runtime')).toBe(true);
            expect(excluded('.build/Runtime/main.ts')).toBe(true);
            expect(excluded('.build/runtime/main.ts')).toBe(!caseSensitivePaths);
            expect(excluded('.build/Runtime-sources/main.ts')).toBe(false);
            expect(excluded('userexcluded/main.ts')).toBe(true);
            expect(excluded('absoluteexcluded/main.ts')).toBe(true);
          } finally {
            session.end();
          }
        }
      } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
      }
    });
  }

  for (const prefix of ['file:', 'FILE:']) {
    it(`supports scanner absolute scope patterns with ${prefix}`, () => {
      const root = normalizeToAbsolutePath('/ci/project');
      const file = normalizeToAbsolutePath('src/main.test.ts', root);
      const configuration = createConfiguration({
        baseDir: root,
        inclusions: [`${prefix}${root}/**/*.ts`],
        exclusions: [`${prefix}**/generated/**`],
        testInclusions: [`${prefix}**/*.test.ts`],
        testExclusions: [`${prefix}${root}/excluded/**`],
      });
      expect(configuration.inclusions[0].match(file)).toBe(true);
      expect(configuration.testInclusions[0].match(file)).toBe(true);
      expect(
        configuration.exclusions[0].match(normalizeToAbsolutePath('generated/file.ts', root)),
      ).toBe(true);
      expect(configuration.testExclusions[0].match(file)).toBe(false);
    });
  }

  it('should fail with a non-absolute baseDir', async () => {
    const baseDir = '../relative/path';
    expect(() => createConfiguration({ baseDir })).toThrow(
      new Error(`baseDir is not an absolute path: ${baseDir}`),
    );
  });
  it('baseDir is mandatory', async () => {
    expect(() => createConfiguration({})).toThrow(
      new Error('baseDir is required and must be a string'),
    );
  });
  it('baseDir must be a string', async () => {
    expect(() => createConfiguration({ baseDir: 123 })).toThrow(
      new Error('baseDir is required and must be a string'),
    );
  });

  it('should default generated-code detection to true and allow overriding it', () => {
    const baseDir = '/path/to/project';

    expect(createConfiguration({ baseDir }).detectGeneratedCode).toBe(true);
    expect(createConfiguration({ baseDir, detectGeneratedCode: false }).detectGeneratedCode).toBe(
      false,
    );
  });
});

describe('isYamlFile', () => {
  it('accepts yaml files without contents', () => {
    const filePath = normalizeToAbsolutePath('/path/to/template.yml');
    expect(isYamlFile(filePath)).toBe(true);
  });

  it('rejects non-yaml extensions', () => {
    const filePath = normalizeToAbsolutePath('/path/to/template.txt');
    expect(isYamlFile(filePath, 'Transform: AWS::Serverless-2016-10-31')).toBe(false);
  });

  it('rejects helm templates ({{ ... }}) outside comment or string', () => {
    const contents = `
Resources:
  Fn::Sub: {{something}}
`;
    const filePath = normalizeToAbsolutePath('/path/to/template.yaml');
    expect(isYamlFile(filePath, contents)).toBe(false);
  });

  it('accepts helm-like tokens in comments or strings', () => {
    const contents = `
# {{ allowed in comment }}
Resources:
  Description: "{{ allowed in string }}"
Transform: AWS::Serverless-2016-10-31
Runtime: nodejs18.x
`;
    const filePath = normalizeToAbsolutePath('/path/to/template.yaml');
    expect(isYamlFile(filePath, contents)).toBe(true);
  });

  it('requires SAM transform and Node.js runtime when contents provided', () => {
    const contents = `
Resources:
  Function:
    Runtime: nodejs18.x
`;
    const filePath = normalizeToAbsolutePath('/path/to/template.yaml');
    expect(isYamlFile(filePath, contents)).toBe(false);
  });

  it('accepts SAM template with Node.js runtime', () => {
    const contents = `
Transform: AWS::Serverless-2016-10-31
Resources:
  Function:
    Runtime: nodejs18.x
`;
    const filePath = normalizeToAbsolutePath('/path/to/template.yaml');
    expect(isYamlFile(filePath, contents)).toBe(true);
  });
});

describe('configurable suffixes', () => {
  it('uses configured html/yaml/css-additional suffixes', () => {
    const config = createConfiguration({
      baseDir: '/path/to/project',
      htmlSuffixes: ['.custom-html'],
      yamlSuffixes: ['.custom-yaml'],
      cssAdditionalSuffixes: ['.custom-style'],
    });

    const htmlPath = normalizeToAbsolutePath('/path/to/template.custom-html');
    const yamlPath = normalizeToAbsolutePath('/path/to/template.custom-yaml');
    const cssAdditionalPath = normalizeToAbsolutePath('/path/to/component.custom-style');

    expect(isHtmlFile(htmlPath, config.htmlSuffixes)).toBe(true);
    expect(isYamlFile(yamlPath, undefined, config.yamlSuffixes)).toBe(true);
    expect(isAlsoCssFile(cssAdditionalPath, config.cssAdditionalSuffixes)).toBe(true);
    expect(isAnalyzableFile(htmlPath, config)).toBe(true);
    expect(isAnalyzableFile(yamlPath, config)).toBe(true);
    expect(isAnalyzableFile(cssAdditionalPath, config)).toBe(true);
  });
});
