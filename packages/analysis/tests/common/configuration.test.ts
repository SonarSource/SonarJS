/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import {
  createConfiguration,
  isAlsoCssFile,
  isAnalyzableFile,
  isHtmlFile,
  isYamlFile,
} from '../../src/common/configuration.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';

describe('createConfiguration', () => {
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
