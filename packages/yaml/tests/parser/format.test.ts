/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import yaml from 'yaml';
import path from 'path';
import { describe, test } from 'node:test';
import { expect } from 'expect';
import { isSupportedFormat, SUPPORTED_STRING_FORMATS } from '../../src/parser/yaml/format.js';
import { readFile } from '../../../shared/src/helpers/files.js';

describe('isSupportedFormat', () => {
  const fixtures = path.join(import.meta.dirname, 'fixtures', 'format');

  SUPPORTED_STRING_FORMATS.forEach(format => {
    test('should support the string format %o', async () => {
      const filePath = path.join(fixtures, `${format}.yaml`);
      const fileContents = await readFile(filePath);
      const tokens = new yaml.Parser().parse(fileContents);
      const [doc] = new yaml.Composer().compose(tokens);
      const {
        contents: {
          items: [pair],
        },
      } = doc as any;
      expect(isSupportedFormat(pair)).toBeTruthy();
    });
  });

  test('should not support an unsupported string format', async () => {
    const filePath = path.join(fixtures, 'unsupported.yaml');
    const fileContents = await readFile(filePath);
    const tokens = new yaml.Parser().parse(fileContents);
    const [doc] = new yaml.Composer().compose(tokens);
    const {
      contents: {
        items: [pair],
      },
    } = doc as any;
    expect(isSupportedFormat(pair)).toBeFalsy();
  });
});
