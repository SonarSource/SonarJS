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
import {
  buildBabelParserOptions,
  buildTsParserOptions,
  buildVueParserOptions,
} from '../../../src/jsts/parsers/options.js';
import { parsersMap } from '../../../src/jsts/parsers/eslint.js';
import { createStandardProgram } from '../../../src/jsts/program/factory.js';
import { createProgramOptions } from '../../../src/jsts/program/tsconfig/options.js';

describe('buildTsParserOptions', () => {
  it('should build options for the typescript-eslint parser', () => {
    const filePath = '/tmp/dir';
    expect(buildTsParserOptions({ filePath })).toEqual({
      tokens: true,
      comment: true,
      disallowAutomaticSingleRunInference: true,
      loc: true,
      range: true,
      ecmaVersion: 2018,
      sourceType: 'module',
      codeFrame: false,
      ecmaFeatures: {
        jsx: true,
        globalReturn: false,
        legacyDecorators: true,
      },
      extraFileExtensions: ['.vue'],
      filePath,
    });
  });

  it('should build options with a TSConfig project', () => {
    const tsConfigs = ['/some/tsconfig'];
    const filePath = '/tmp/dir';
    expect(buildTsParserOptions({ filePath, project: tsConfigs })).toEqual(
      expect.objectContaining({
        project: tsConfigs,
      }),
    );
  });

  it('should build options with a TypeScript program', () => {
    const tsConfig = path.join(import.meta.dirname, 'fixtures', 'options', 'tsconfig.json');
    const programOptions = createProgramOptions(tsConfig, undefined, true);
    const program = createStandardProgram(programOptions);

    const filePath = '/tmp/dir';
    expect(buildTsParserOptions({ filePath, programs: [program] })).toEqual(
      expect.objectContaining({
        programs: [program],
      }),
    );
  });

  it('should let overrides win over defaults', () => {
    expect(buildTsParserOptions({ sourceType: 'script' })).toEqual(
      expect.objectContaining({ sourceType: 'script' }),
    );
  });

  it('should use detectedEsYear as ecmaVersion when provided', () => {
    expect(buildTsParserOptions({}, { detectedEsYear: 2022 })).toEqual(
      expect.objectContaining({ ecmaVersion: 2022 }),
    );
  });

  it('should fall back to the default ecmaVersion when detectedEsYear is undefined', () => {
    expect(buildTsParserOptions({}, {})).toEqual(expect.objectContaining({ ecmaVersion: 2018 }));
    expect(buildTsParserOptions()).toEqual(expect.objectContaining({ ecmaVersion: 2018 }));
  });

  it('should let an explicit ecmaVersion override win over detectedEsYear', () => {
    expect(buildTsParserOptions({ ecmaVersion: 2020 }, { detectedEsYear: 2022 })).toEqual(
      expect.objectContaining({ ecmaVersion: 2020 }),
    );
  });

  it('should always default sourceType to module', () => {
    expect(buildTsParserOptions()).toEqual(expect.objectContaining({ sourceType: 'module' }));
    expect(buildTsParserOptions({}, { detectedEsYear: 2022 })).toEqual(
      expect.objectContaining({ sourceType: 'module' }),
    );
  });

  it('should let an explicit sourceType override win', () => {
    expect(buildTsParserOptions({ sourceType: 'script' })).toEqual(
      expect.objectContaining({ sourceType: 'script' }),
    );
  });

  it('should disable jsx in ecmaFeatures when context.jsx is false', () => {
    expect(buildTsParserOptions({}, { jsx: false })).toEqual(
      expect.objectContaining({
        ecmaFeatures: expect.objectContaining({ jsx: false }),
      }),
    );
  });

  it('should default jsx to true when not specified in context', () => {
    expect(buildTsParserOptions()).toEqual(
      expect.objectContaining({
        ecmaFeatures: expect.objectContaining({ jsx: true }),
      }),
    );
  });
});

describe('buildBabelParserOptions', () => {
  it('should build options for the babel-eslint parser', () => {
    const parserOptions = buildBabelParserOptions({ filePath: '/tmp/dir' });
    expect(parserOptions).toEqual(
      expect.objectContaining({
        requireConfigFile: false,
        filePath: '/tmp/dir',
      }),
    );
    expect(parserOptions.babelOptions).toEqual(
      expect.objectContaining({
        babelrc: false,
        configFile: false,
      }),
    );
  });

  it('should not include typescript-eslint-specific options', () => {
    const parserOptions = buildBabelParserOptions();
    expect(parserOptions).not.toHaveProperty('disallowAutomaticSingleRunInference');
    expect(parserOptions).not.toHaveProperty('extraFileExtensions');
  });

  it('should propagate detectedEsYear and fall back to the default', () => {
    expect(buildBabelParserOptions({}, { detectedEsYear: 2022 })).toEqual(
      expect.objectContaining({ ecmaVersion: 2022 }),
    );
    expect(buildBabelParserOptions()).toEqual(expect.objectContaining({ ecmaVersion: 2018 }));
  });
});

describe('buildVueParserOptions', () => {
  it('should wire the typescript-eslint sub-parser when scriptLang is ts', () => {
    const parserOptions = buildVueParserOptions('ts');
    expect(parserOptions).toEqual(
      expect.objectContaining({
        parser: parsersMap.typescript,
        disallowAutomaticSingleRunInference: true,
        extraFileExtensions: ['.vue'],
      }),
    );
  });

  it('should wire the babel-eslint sub-parser when scriptLang is js', () => {
    const parserOptions = buildVueParserOptions('js');
    expect(parserOptions).toEqual(
      expect.objectContaining({
        parser: parsersMap.javascript,
        requireConfigFile: false,
      }),
    );
    expect(parserOptions).not.toHaveProperty('disallowAutomaticSingleRunInference');
    expect(parserOptions).not.toHaveProperty('extraFileExtensions');
  });

  it('should let overrides win over defaults', () => {
    expect(buildVueParserOptions('ts', { filePath: '/some/file.vue' })).toEqual(
      expect.objectContaining({ filePath: '/some/file.vue' }),
    );
  });

  it('should propagate detectedEsYear to both scriptLang variants', () => {
    expect(buildVueParserOptions('ts', {}, { detectedEsYear: 2022 })).toEqual(
      expect.objectContaining({ ecmaVersion: 2022 }),
    );
    expect(buildVueParserOptions('js', {}, { detectedEsYear: 2022 })).toEqual(
      expect.objectContaining({ ecmaVersion: 2022 }),
    );
  });
});
