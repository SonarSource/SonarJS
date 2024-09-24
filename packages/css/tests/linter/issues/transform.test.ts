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
import * as stylelint from 'stylelint';
import { transform } from '../../../src/linter/issues/index.ts';

describe('transform', () => {
  it('should transform Stylelint results into issues', () => {
    const filePath = '/tmp/path';
    const results = [
      {
        source: filePath,
        warnings: [
          {
            rule: 'some-rule',
            text: 'some-text',
            line: 42,
            column: 4242,
          },
        ],
      },
    ] as stylelint.LintResult[];

    const issues = transform(results, filePath);

    expect(issues).toEqual([
      {
        ruleId: 'some-rule',
        message: 'some-text',
        line: 42,
        column: 4242,
      },
    ]);
  });

  it('should not transform Stylelint results from a different file', () => {
    console.log = jest.fn();

    const filePath = '/tmp/path';
    const source = '/some/fake/source';
    const results = [
      {
        source,
        warnings: [
          {
            rule: 'some-rule',
            text: 'some-text',
            line: 42,
            column: 4242,
          },
        ],
      },
    ] as stylelint.LintResult[];

    const issues = transform(results, filePath);

    expect(issues).toHaveLength(0);
    expect(console.log).toHaveBeenCalledWith(
      `DEBUG For file [${filePath}] received issues with [${source}] as a source. They will not be reported.`,
    );
  });
});
