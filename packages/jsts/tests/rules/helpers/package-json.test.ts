/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import path from 'node:path';
import { stripBOM } from '../../../src/rules/helpers/index.js';
import { readFile } from 'node:fs/promises';
import { expect } from 'expect';
import { getDependenciesFromPackageJson } from '../../../src/rules/helpers/package-jsons/parse.js';

describe('package-json', () => {
  it('should handle arrays in package-jsons dependency versions', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'package.json');
    const fileContent = JSON.parse(stripBOM(await readFile(filePath, 'utf8')));
    const dependencies = getDependenciesFromPackageJson(fileContent);
    expect(dependencies).toEqual(
      new Set([
        {
          name: 'foo',
          version: 'file:bar',
        },
      ]),
    );
  });
});
