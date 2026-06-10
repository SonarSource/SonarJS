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

export const cypressExamples = `
describe('checkout', () => {
  it('submits the form', () => {
    cy.get('button[type=submit]').click({ force: true });
  });
});
`;

export const playwrightExamples = `
import { expect, test } from '@playwright/test';

test('submits the form', async ({ page }) => {
  await page.getByRole('button', { name: 'Submit' }).click({ force: true });
});
`;
