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
import { join } from 'node:path/posix';
import { readFileSync } from 'node:fs';

const generatorSource = readFileSync(
  join(import.meta.dirname, '../../../tools/generate-eslint-meta.ts'),
  'utf8',
);

describe('generate-eslint-meta source of truth', () => {
  it('should derive generated-source suppression from RSPEC tags', () => {
    expect(generatorSource).not.toContain('generated-source-irrelevant-rules.js');
    expect(generatorSource).toContain("'editable-source'");
  });
});
