/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import path from 'path';
import { SourceCode } from 'eslint';
import { setContext } from 'helpers';
import { initializeLinter, linter, LinterWrapper } from 'linting/eslint';
import { parseJavaScriptSourceFile } from '../../../tools';

describe('initializeLinter', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should initialize the linter wrapper', () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });

    console.log = jest.fn();

    expect(linter).toBeUndefined();

    initializeLinter([{ key: 'no-extra-semi', configurations: [], fileTypeTarget: ['MAIN'] }]);

    expect(linter).toBeDefined();
    expect(linter).toBeInstanceOf(LinterWrapper);
    expect(console.log).toHaveBeenCalledWith('DEBUG initializing linter with no-extra-semi');

    const filePath = path.join(__dirname, 'fixtures', 'index', 'regular.js');
    const sourceCode = parseJavaScriptSourceFile(filePath) as SourceCode;

    const {
      issues: [issue],
    } = linter.lint(sourceCode, filePath);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'no-extra-semi',
        line: 1,
        column: 8,
      }),
    );
  });

  it('should load rule bundles', () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: ['custom-rule-bundle'],
    });

    console.log = jest.fn();

    initializeLinter([{ key: 'custom-rule', configurations: [], fileTypeTarget: ['MAIN'] }]);

    expect(linter).toBeDefined();
    expect(console.log).toHaveBeenCalledWith(
      'DEBUG Loaded rules custom-rule from custom-rule-bundle',
    );
    expect(console.log).toHaveBeenCalledWith('DEBUG initializing linter with custom-rule');

    const filePath = path.join(__dirname, 'fixtures', 'index', 'custom.js');
    const sourceCode = parseJavaScriptSourceFile(filePath) as SourceCode;

    const {
      issues: [issue],
    } = linter.lint(sourceCode, filePath);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'custom-rule',
        line: 1,
        column: 0,
        endLine: 1,
        endColumn: 3,
        message: 'call',
      }),
    );
  });
});
