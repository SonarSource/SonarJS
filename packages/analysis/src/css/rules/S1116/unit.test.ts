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
import { meta } from './meta.js';
import { LinterWrapper } from '../../linter/wrapper.js';
import { normalizeToAbsolutePath } from '../../../../../shared/src/helpers/files.js';

const RULE = meta.bindings[0].stylelintKey;

async function lint(extension: string, code: string) {
  const linter = new LinterWrapper();
  linter.initialize([{ key: RULE, configurations: [] }]);
  return (await linter.lint(normalizeToAbsolutePath(`input.${extension}`), code)).issues;
}

describe('S1116', () => {
  for (const extension of ['css', 'scss', 'less']) {
    it(`accepts clean ${extension} without configuration diagnostics`, async () => {
      expect(await lint(extension, 'a { color: red; content: ";;"; /* ;; */ }')).toEqual([]);
    });

    it(`reports an extra semicolon in ${extension} under the Sonar binding`, async () => {
      expect(await lint(extension, 'a { top: 6%;; }')).toEqual([
        expect.objectContaining({
          ruleId: RULE,
          message: 'Unexpected extra semicolon',
          line: 1,
          column: 12,
        }),
      ]);
    });
  }

  it('accepts indented Sass without configuration diagnostics', async () => {
    expect(await lint('sass', 'a\n  color: red\n')).toEqual([]);
  });

  for (const extension of ['html', 'vue']) {
    it(`routes each embedded syntax independently in ${extension}`, async () => {
      const code = [
        '<style>a { top: 6%;; }</style>',
        '<style lang="scss">a { top: 6%;; }</style>',
        '<style lang="less">a { top: 6%;; }</style>',
        '<style lang="sass">\na\n  color: red\n</style>',
      ].join('\n');
      const issues = await lint(extension, code);
      expect(issues).toHaveLength(3);
      expect(issues).toEqual(
        [1, 2, 3].map(line =>
          expect.objectContaining({ ruleId: RULE, message: 'Unexpected extra semicolon', line }),
        ),
      );
    });

    it(`accepts clean embedded styles in ${extension}`, async () => {
      expect(
        await lint(
          extension,
          '<style>a { color: red; }</style>\n' +
            '<style lang="scss">a { color: red; }</style>\n' +
            '<style lang="less">a { color: red; }</style>',
        ),
      ).toEqual([]);
    });
  }

  it('does not turn the charset configuration advisory into an issue', async () => {
    expect(await lint('css', '@charset "UTF-8";\na { color: red; }')).toEqual([]);
  });

  it('still reports extra semicolons in a file containing charset', async () => {
    expect(await lint('css', '@charset "UTF-8";\na { top: 6%;; }')).toEqual([
      expect.objectContaining({
        ruleId: RULE,
        message: 'Unexpected extra semicolon',
        line: 2,
        column: 12,
      }),
    ]);
  });
});
