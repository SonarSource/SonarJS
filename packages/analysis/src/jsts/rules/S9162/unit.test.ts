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
  it('reports assertion-only Cypress then callbacks', () => {
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
            cy.get('input').then($input => {
              const text = $input.text(), expected = 'Ready';
              expect(text).to.equal(expected);
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
      ],
    });
  });

  it('accepts retry-safe local calculations', () => {
    ruleTester.run('prefer-cypress-should', rule, {
      valid: [],
      invalid: [
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
          filename: path.join(import.meta.dirname, 'fixtures-no-package', 'status.cy.js'),
          code: `
            cy.get('[data-cy=status]').then($status => {
              expect($status.text()).to.equal('Ready');
            });
          `,
          errors: 1,
        },
      ],
    });
  });

  it('ignores callbacks that are unsafe or not Cypress assertions', () => {
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
          filename: fixtureFile.replace(/\.js$/, '.ts'),
          code: `
            cy.get('input').then<string>($input => {
              expect($input.text()).to.equal('Ready');
            });
          `,
        },
      ],
      invalid: [],
    });
  });

  it('supports the conservative Chai and TypeScript assertion forms', () => {
    ruleTester.run('prefer-cypress-should', rule, {
      valid: [],
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
