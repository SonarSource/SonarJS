/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { setContext } from '../../../shared/src/index.js';
import { initializeLinter, getLinter, LinterWrapper } from '../../../jsts/src/index.js';
import { parseJavaScriptSourceFile } from '../tools/index.js';
import { describe, it, mock, Mock } from 'node:test';
import { expect } from 'expect';
import { pathToFileURL } from 'node:url';

describe('initializeLinter', () => {
  it('should initialize the linter wrapper', async () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });

    console.log = mock.fn();

    expect(getLinter).toThrow();

    await initializeLinter([{ key: 'S1116', configurations: [], fileTypeTarget: ['MAIN'] }]);

    const linter = getLinter();

    expect(linter).toBeDefined();
    expect(linter).toBeInstanceOf(LinterWrapper);
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain('DEBUG Initializing linter "default" with S1116');

    const filePath = path.join(import.meta.dirname, 'fixtures', 'index', 'regular.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const {
      issues: [issue],
    } = linter.lint(sourceCode, filePath);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S1116',
        line: 1,
        column: 8,
      }),
    );
  });

  it('should load rule bundles', async () => {
    const bundlePath = pathToFileURL(
      path.join(import.meta.dirname, 'fixtures', 'index', 'custom-rule-bundle', 'rules.js'),
    ).href;
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [bundlePath],
    });

    console.log = mock.fn();

    await initializeLinter([{ key: 'custom-rule', configurations: [], fileTypeTarget: ['MAIN'] }]);

    const linter = getLinter();

    expect(linter).toBeDefined();
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain(`DEBUG Loaded rules custom-rule from ${bundlePath}`);
    expect(logs).toContain('DEBUG Initializing linter "default" with custom-rule');

    const filePath = path.join(import.meta.dirname, 'fixtures', 'index', 'custom.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

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
