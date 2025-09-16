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
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { readFile } from '../../../shared/src/helpers/files.js';
import { parseAwsFromYaml } from '../../src/aws/parser.js';
import { APIError } from '../../../shared/src/errors/error.js';

describe('parseAwsFromYaml()', () => {
  it('should parse valid YAML syntax', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'parser', 'valid.yaml');
    const fileContent = await readFile(filePath);
    const embedded = parseAwsFromYaml(fileContent);
    expect(embedded).toBeDefined();
    expect(embedded).toHaveLength(1);
    expect(embedded[0]).toEqual(
      expect.objectContaining({
        code: `if (foo()) bar(); else bar();`,
        line: 8,
        column: 18,
        offset: 177,
      }),
    );
  });

  it('should extract the resource name', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'parser', 'resource-names.yaml');
    const fileContent = await readFile(filePath);
    const [firstEmbedded, secondEmbedded] = parseAwsFromYaml(fileContent);
    expect(firstEmbedded).toEqual(
      expect.objectContaining({
        extras: {
          resourceName: 'SomeLambdaFunction',
        },
      }),
    );
    expect(secondEmbedded).toEqual(
      expect.objectContaining({
        extras: {
          resourceName: 'SomeServerlessFunction',
        },
      }),
    );
  });

  it('should fail parsing invalid YAML syntax', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'parser', 'invalid.yaml');
    const fileContent = await readFile(filePath);
    expect(() => parseAwsFromYaml(fileContent)).toThrow(
      APIError.parsingError('Missing closing "quote', { line: 7 }),
    );
  });
});
