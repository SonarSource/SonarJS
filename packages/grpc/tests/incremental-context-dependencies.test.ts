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
import { sourceDependencies } from '../src/incremental-context.js';

describe('context baseline source dependencies', () => {
  it('allows ordinary source edits and shifted dependency locations', () => {
    expect(sourceDependencies('file.ts', "import { x } from './values'; x.sort();")).toBe(
      sourceDependencies('file.ts', "// comment\nimport { x } from './values'; x.reverse();"),
    );
  });

  for (const source of [
    "import { x } from './before';",
    "export { x } from './before';",
    "import x = require('./before');",
    "const x = require('./before');",
    "const x = import('./before');",
    "type X = import('./before').X;",
    "declare module './before' {}",
    '/// <reference path="./before" />',
    '/// <reference types="./before" />',
    '/// <reference lib="./before" />',
  ]) {
    it('invalidates a changed dependency in ' + source, () => {
      expect(sourceDependencies('file.ts', source)).not.toBe(
        sourceDependencies('file.ts', source.replace('./before', './after')),
      );
    });
  }

  it('invalidates changed module classification', () => {
    const script = 'const x = 1;';
    expect(sourceDependencies('file.ts', script)).not.toBe(
      sourceDependencies('file.ts', script + '\nexport {};'),
    );
  });
});
