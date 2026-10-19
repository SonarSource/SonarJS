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
import { rule } from './index.js';
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

for (const Tester of [DefaultParserRuleTester, NoTypeCheckingRuleTester]) {
  describe(`S6772 with ${Tester.name}`, () => {
    it('allows leading dots and commas while preserving other spacing checks', () => {
      const ruleTester = new Tester();
      ruleTester.run('jsx-child-element-spacing', rule, {
        valid: [
          ...['.', ','].flatMap(punctuation =>
            ['', ' Next words', '\n  Next words'].flatMap(suffix =>
              ['\n', '\n  ', '\n\n\t', '\r\n    '].map(whitespace => ({
                code: `<p><strong>{name}</strong>${whitespace}${punctuation}${suffix}</p>`,
              })),
            ),
          ),
          { code: '<><em>Finished</em>\n. Next sentence</>' },
          { code: '<><a href="/">Home</a>\n, welcome!</>' },
          {
            code: '<><strong>Hello</strong>\n, Next words\n{/* joined */}<em>continue</em></>',
          },
          { code: '<Typography><span>{name}</span>\n.</Typography>' },
          { code: '<p><strong>Hello</strong>\n&#46; Next sentence</p>' },
          { code: '<p><strong>Hello</strong>\n&#44; welcome!</p>' },
          { code: '<p><strong>Hello</strong> world</p>' },
          { code: '<p><strong>Hello</strong>\n</p>' },
          { code: "<p><strong>Hello</strong>{' '}\nworld</p>" },
          { code: '<p><strong>Hello</strong>{/* joined */}\nworld</p>' },
          { code: '<p>world\n{/* joined */}<strong>Hello</strong></p>' },
          { code: '<p><div>Hello</div>\nworld</p>' },
          { code: '<p><strong>Hello</strong>\n, <em>friend</em></p>' },
          ...[' ', '\r', '\t'.repeat(10_000), '\n  Next words '].map(trailing => ({
            code: `<p><strong>Hello</strong>\n, Next words${trailing}<em>continue</em></p>`,
          })),
        ],
        invalid: [
          ...['world', 'world, welcome', ':', ';', '!', '?', '…', '。'].map(text => ({
            code: `<p><strong>Hello</strong>\n  ${text}</p>`,
            errors: [
              {
                message: 'Ambiguous spacing after previous element strong',
                type: 'JSXElement',
                line: 1,
                column: 26,
              },
            ],
          })),
          ...['world', '.', ','].map(text => ({
            code: `<p>${text}\n  <strong>Hello</strong></p>`,
            errors: [
              {
                message: 'Ambiguous spacing before next element strong',
                type: 'JSXElement',
                line: 2,
                column: 3,
              },
            ],
          })),
          {
            code: '<><em>Hello</em>\nworld</>',
            errors: [{ message: 'Ambiguous spacing after previous element em' }],
          },
          {
            code: '<p><strong>Hello</strong>. Next sentence\n<em>continues</em></p>',
            errors: [{ message: 'Ambiguous spacing before next element em' }],
          },
          {
            code: '<><strong>Hello</strong>\n, Next words\n<em>continue</em></>',
            errors: [
              {
                message: 'Ambiguous spacing before next element em',
                line: 3,
                column: 1,
              },
            ],
          },
          ...['.', ','].map(punctuation => ({
            code: `<p><strong>Hello</strong>\n${punctuation} Next words\n<em>continue</em></p>`,
            errors: [
              {
                message: 'Ambiguous spacing before next element em',
                line: 3,
                column: 1,
              },
            ],
          })),
          ...['\r\n', ' \n\t\r ', `${' '.repeat(10_000)}\n\t`].map(trailing => ({
            code: `<p><strong>Hello</strong>\n, Next words${trailing}<em>continue</em></p>`,
            errors: [{ message: 'Ambiguous spacing before next element em' }],
          })),
        ],
      });
    });
  });
}

describe('S6772 with TypeScript JSX', () => {
  it('allows the comma after a JSON diff row', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('jsx-child-element-spacing', rule, {
      valid: [
        {
          code: `
function LineDiffViewer({ value, status }: { value: string; status: string }) {
  return (
    <li>
      <span class={[status, 'result']}>
        {value}
      </span>
      ,
    </li>
  );
}
`,
        },
      ],
      invalid: [],
    });
  });

  it('checks spacing in typed JSX render functions', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('jsx-child-element-spacing', rule, {
      valid: [
        {
          code: 'const render = (name: string) => <p><strong>{name}</strong>\n.</p>;',
        },
        {
          code: 'const render = (name: string) => <><em>{name}</em>\n, welcome!</>;',
        },
      ],
      invalid: [
        {
          code: 'const render = (name: string) => <p><strong>{name}</strong>\nworld</p>;',
          errors: [{ message: 'Ambiguous spacing after previous element strong' }],
        },
      ],
    });
  });
});
