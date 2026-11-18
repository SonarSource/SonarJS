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
import { join } from 'node:path';
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from '../rule.js';

const filename = join(import.meta.dirname, 'fixtures', 'cb.fixture.js');

function testCase(helper: string, assertion = "getTable().should('be.visible');") {
  return `describe('Tables', () => {
    ${helper}
    it('renders', () => { ${assertion} });
  });`;
}

describe('S2699 Cypress helpers', () => {
  for (const Tester of [DefaultParserRuleTester, NoTypeCheckingRuleTester, RuleTester]) {
    it(Tester.name, () => {
      const tester = new Tester(
        Tester === RuleTester
          ? { parserOptions: { project: join(import.meta.dirname, '../../tsconfig.cb.json') } }
          : {},
      );
      tester.run('Recognizes assertions on returned Cypress chains', rule, {
        valid: [
          "const getTable = () => cy.getByDataCy('table');",
          "const getTable = () => cy.get('table');",
          "const getTable = () => { return cy.get('table'); };",
          "const getTable = function () { return cy.get('table'); };",
          "function getTable() { return cy.get('table'); }",
          "const select = () => cy.get('table'); const getTable = () => select();",
          "const table = cy.get('table'); const getTable = () => table;",
        ]
          .map(helper => ({ filename, code: testCase(helper) }))
          .concat([
            {
              filename,
              code: testCase(
                "const getTable = () => cy.get('table');",
                "getTable().and('be.visible');",
              ),
            },
            {
              filename,
              code: testCase(
                "const getTable = () => cy.get('table');",
                "getTable().find('tr').should('have.length', 1);",
              ),
            },
          ]),
        invalid: [
          // Known false positive: object methods returning Cypress chains are not resolved.
          testCase(
            "const page = { getTable() { return cy.get('table'); } };",
            "page.getTable().should('be.visible');",
          ),
          testCase("const getTable = () => cy.get('table');", 'getTable().click();'),
          testCase('const getTable = () => unrelated();'),
          testCase('const getTable = () => ({ should() {} });'),
          testCase("const getTable = () => { cy.get('table'); };"),
          testCase('const getTable = () => { return; };'),
          testCase("function getTable() { cy.get('table'); return unrelated(); }"),
          testCase("let getTable = () => cy.get('table'); getTable = unrelated;"),
          testCase("function getTable() { return cy.get('table'); } getTable = unrelated;"),
          testCase('const getTable = () => getTable();'),
          testCase('const first = () => getTable(); const getTable = () => first();'),
          testCase('const getTable = () => table; const table = other; const other = table;'),
          testCase("const getTable = cy => cy.get('table');"),
          testCase("const getTable = async () => cy.get('table');"),
          testCase("function* getTable() { return cy.get('table'); }"),
        ].map(code => ({ filename, code, errors: 1 })),
      });
    });
  }
});
