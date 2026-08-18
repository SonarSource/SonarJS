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
import path from 'node:path';
import { describe, it } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

const ruleTester = new NoTypeCheckingRuleTester();
const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'cypress', 'e2e', 'status.cy.js');

describe('S9162', () => {
  it('reports retryable assertion-only Cypress callbacks', () => {
    ruleTester.run('prefer-cypress-should', rule, {
      valid: [
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              initializePlugin($input[0]);
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              let text = $input.text();
              expect(text).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then(({ value }) => {
              expect(value).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then(($input = getInput()) => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then(function* ($input) {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then({ timeout: 1000 }, $input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input')['then']($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: path.join(import.meta.dirname, 'fixtures', 'src', 'status.js'),
          code: `
            cy.get('input').then($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              const values = { ...source };
              expect($input.text()).to.equal(values.text);
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              const text = source.text;
              expect($input.text()).to.equal(text);
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            const externalPrototype = {
              get text() {
                initializePlugin();
                return 'Ready';
              },
            };
            cy.get('input').then($input => {
              const values = { __proto__: externalPrototype };
              expect(values.text).to.equal('Ready');
            });
          `,
        },
      ],
      invalid: [
        {
          filename: fixtureFile,
          code: `
            cy.get('[data-cy=status]').then($status => {
              expect($status.text()).to.equal('Ready');
            });
          `,
          errors: [
            {
              messageId: 'retryAssertions',
              type: 'Identifier',
              suggestions: [
                {
                  messageId: 'useShould',
                  output: `
            cy.get('[data-cy=status]').should($status => {
              expect($status.text()).to.equal('Ready');
            });
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              const text = $input.text(), expected = 'Ready';
              expect(text).to.equal(expected);
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.contains('Ready').then($status => {
              expect($status.text()).to.equal('Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('form').find('input').then($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('li').eq(0).then($item => {
              expect($item.text()).to.equal('Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('li').first().then($item => {
              expect($item.text()).to.equal('Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('[data-cy=status]').then($status => {
              const text = $status.text().trim();
              expect(text).to.equal('Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('[data-cy=status]').then($status => {
              const expected = { text: 'Ready', codes: [200] };
              expect($status.text()).to.equal(expected.text);
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('[data-cy=status]').then($status => {
              const text = \`\${$status.text().trim()}!\`;
              expect(text).to.equal('Ready!');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('[data-cy=status]').then($status => {
              const isEmpty = !$status.text().trim();
              expect(isEmpty).to.equal(false);
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('[data-cy=status]').then($status => {
              const isReady = $status.text() === 'Ready';
              expect(isReady).to.equal(true);
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('[data-cy=status]').then($status => {
              const text = $status.text() || 'Loading';
              expect(text).to.equal('Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('[data-cy=status]').then($status => {
              const status = $status.text() ? 'Ready' : 'Loading';
              expect(status).to.equal('Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile.replace(/\.js$/, '.ts'),
          code: `
            cy.get<HTMLInputElement>('input').then($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get(\`[data-cy=\${name}]\`).then($status => {
              expect($status.text()).to.equal('Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy?.get('input').then($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
          errors: 1,
        },
      ],
    });
  });

  it('distinguishes supported assertions from unsafe or irrelevant callbacks', () => {
    ruleTester.run('prefer-cypress-should', rule, {
      valid: [
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              expect(initializePlugin($input[0])).to.equal(true);
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              expect($input.text()).to.equal(updateExpected());
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              expect($input.text(), recordAssertion()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              expect($input.text()).to.equal('Ready');
              initializePlugin($input[0]);
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              cy.wrap($input).should('be.visible');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.wrap({ text: () => initializePlugin() }).then(value => {
              expect(value.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.wrap($input).find('span').then($span => {
              expect($span.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('li').filter((_, element) => sideEffect(element)).then($element => {
              expect($element.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('@customSubject').then(value => {
              expect(value.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              return $input.text();
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then(async $input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => expect($input.text()).to.equal('Ready'));
          `,
        },
        {
          filename: fixtureFile,
          code: `
            const callback = $input => {
              expect($input.text()).to.equal('Ready');
            };
            cy.get('input').then(callback);
          `,
        },
        {
          filename: fixtureFile,
          code: `
            Promise.resolve('Ready').then(status => {
              expect(status).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            const cy = createClient();
            cy.get('input').then($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then?.($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            function expect(value) {
              return { to: { equal() {} } };
            }
            cy.get('input').then($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              expect(1).to.equal(2);
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              const expected = { text: 'Ready' };
              expect(expected).to.deep.equal({ text: 'Ready' });
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then(() => {
              expect(1).to.equal(2);
            });
          `,
        },
        {
          filename: fixtureFile,
          code: `
            const expected = 'Ready';
            cy.get('input').then($input => {
              expect(expected).to.equal('Ready');
            });
          `,
        },
        {
          filename: fixtureFile.replace(/\.js$/, '.ts'),
          code: `
            cy.get('input').then<string>($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
      ],
      invalid: [
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then(function ($input) {
              assert.equal($input.text(), 'Ready');
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile,
          code: `
            cy.get('input').then($input => {
              expect($input.text()).to.equal('Ready');
              expect($input).to.exist;
            });
          `,
          errors: 1,
        },
        {
          filename: fixtureFile.replace(/\.js$/, '.ts'),
          code: `
            (cy.get('input') as Cypress.Chainable<JQuery<HTMLInputElement>>).then($input => {
              const text = ($input.text() as string).trim();
              expect(text).to.equal('Ready');
            });
          `,
          errors: 1,
        },
      ],
    });
  });
});
