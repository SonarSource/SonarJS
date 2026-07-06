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
import ts from 'typescript';
import { importsModuleTS } from '../../../../src/jsts/rules/helpers/module-ts.js';

describe('module-ts', () => {
  it('detects imported and required modules in a TypeScript source file', () => {
    const sourceFile = ts.createSourceFile(
      'fixture.ts',
      `
        import chai from 'chai';
        const alsoChai = require('chai');
        const assert = require('chai').assert;
      `,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    expect(importsModuleTS(sourceFile, ['chai'])).toEqual(true);
  });

  it('returns false when the module is not imported', () => {
    const sourceFile = ts.createSourceFile(
      'fixture.ts',
      `
        import { expect } from 'vitest';
        const helper = require('./helper');
      `,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    expect(importsModuleTS(sourceFile, ['chai'])).toEqual(false);
  });

  it('detects required modules across multiple declarations in one statement', () => {
    const sourceFile = ts.createSourceFile(
      'fixture.ts',
      `
        const helper = require('./helper'), assert = require('chai').assert;
      `,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    expect(importsModuleTS(sourceFile, ['chai'])).toEqual(true);
  });
});
