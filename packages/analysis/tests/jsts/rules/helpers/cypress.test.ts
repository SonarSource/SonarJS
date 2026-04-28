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
import type estree from 'estree';
import { isAssertion, isTSAssertion } from '../../../../src/jsts/rules/helpers/cypress.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';

describe('Cypress.js', () => {
  it('should recognize Cypress assertions', () => {
    expect(isAssertion(call(member(cyCommand('get'), 'should')))).toEqual(true);
    expect(isAssertion(call(member(call(member(cyCommand('get'), 'should')), 'and')))).toEqual(
      true,
    );
    expect(isAssertion(call(member(chain(cyCommand('get')), 'should')))).toEqual(true);
  });

  it('should not recognize other calls as Cypress assertions', () => {
    expect(isAssertion(identifier('cy'))).toEqual(false);
    expect(isAssertion(call(member(cyCommand('get'), 'should', true)))).toEqual(false);
    expect(isAssertion(call(member(cyCommand('get'), 'click')))).toEqual(false);
    expect(isAssertion(call(member(command(identifier('foo'), 'get'), 'should')))).toEqual(false);
  });

  it('should recognize TypeScript Cypress assertions', () => {
    expect(isTSAssertion(tsExpression(`cy.get('.greeting').should('be.visible')`))).toEqual(true);
    expect(isTSAssertion(tsExpression(`cy.get('.greeting')!.should('be.visible')`))).toEqual(true);
  });

  it('should not recognize other TypeScript calls as Cypress assertions', () => {
    expect(isTSAssertion(ts.factory.createIdentifier('cy'))).toEqual(false);
    expect(isTSAssertion(tsExpression(`cy.get('.greeting').click()`))).toEqual(false);
    expect(isTSAssertion(tsExpression(`foo.get('.greeting').should('be.visible')`))).toEqual(false);
  });
});

function identifier(name: string): estree.Identifier {
  return { type: 'Identifier', name } as estree.Identifier;
}

function member(
  object: estree.Expression,
  property: string,
  computed = false,
): estree.MemberExpression {
  return {
    type: 'MemberExpression',
    object,
    property: identifier(property),
    computed,
    optional: false,
  } as unknown as estree.MemberExpression;
}

function call(callee: estree.Expression): estree.CallExpression {
  return {
    type: 'CallExpression',
    callee,
    arguments: [],
    optional: false,
  } as unknown as estree.CallExpression;
}

function command(object: estree.Expression, property: string): estree.CallExpression {
  return call(member(object, property));
}

function cyCommand(property: string): estree.CallExpression {
  return command(identifier('cy'), property);
}

function chain(expression: estree.Expression): estree.ChainExpression {
  return { type: 'ChainExpression', expression } as unknown as estree.ChainExpression;
}

function tsExpression(code: string): ts.Expression {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    `${code};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const statement = sourceFile.statements[0] as ts.ExpressionStatement;
  return statement.expression;
}
