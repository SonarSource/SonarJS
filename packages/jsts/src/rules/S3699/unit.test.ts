/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
import { rule } from './rule';
import { JavaScriptRuleTester } from '../../../tests/tools';
import { RuleTester } from 'eslint';

const ruleTester = new JavaScriptRuleTester();

const FUNCTION_NO_RETURN = 'function noReturn() { }\n ';

ruleTester.run('no-use-of-empty-return-value', rule, {
  valid: [
    { code: 'function withReturn() { return 1; } console.log(withReturn());' },
    { code: 'let x = () => {}; if (cond) {x = () => 1} let y = x();' },
    { code: 'var x = function x() { return 42 }; y = x();' },
    { code: FUNCTION_NO_RETURN + 'noReturn();' },
    { code: FUNCTION_NO_RETURN + 'async function foo() { await noReturn(); }' },
    { code: FUNCTION_NO_RETURN + 'function foo() { return noReturn(); }' },
    { code: FUNCTION_NO_RETURN + '(noReturn());' },
    { code: FUNCTION_NO_RETURN + 'let arrowFunc = p => noReturn();' },
    { code: FUNCTION_NO_RETURN + 'let arrowFunc = p => (noReturn());' },
    { code: FUNCTION_NO_RETURN + 'cond ? noReturn() : somethingElse();' },
    { code: FUNCTION_NO_RETURN + 'boolVar && noReturn();' },
    { code: FUNCTION_NO_RETURN + 'boolVar || noReturn();' },
    { code: 'function noReturn() { return; }; noReturn();' },
    { code: 'function withReturn() { return 42; }; x = noReturn();' },
    { code: '(function(){}());' },
    { code: '!function(){}();' },
    { code: 'class A { methodNoReturn() {}\n foo() { console.log(this.methodNoReturn()); } }' }, // FN
    { code: 'var arrowImplicitReturn = (a) => a*2;  x = arrowImplicitReturn(1);' },
    {
      code: 'var arrowReturnsPromise = async () => {  var x = () => {return 1} };   x = arrowReturnsPromise();',
    },
    {
      code: 'async function statementReturnsPromise() { var x = () => {return 1} }\n  x = statementReturnsPromise();',
    },
    { code: 'function* noReturn() { yield 1; } noReturn().next();' },
    { code: 'function* noReturn() { yield 1; } noReturn();' },
    { code: 'declare function withReturn(): number; let x = withReturn();' },
  ],
  invalid: [
    invalidPrefixWithFunction('console.log(noReturn());'),
    invalidPrefixWithFunction('x = noReturn();'),
    invalidPrefixWithFunction('noReturn() ? foo() : bar();'),
    invalidPrefixWithFunction('noReturn().foo();'),
    invalidPrefixWithFunction('let x = noReturn();'),
    invalidPrefixWithFunction('for (var x in noReturn()) { }'),
    invalidPrefixWithFunction('for (var x of noReturn()) { }'),
    invalidPrefixWithFunction('noReturn() && doSomething();'),
    invalid('var noReturn = function () { 1; }; console.log(noReturn());'),
    invalid('var noReturn = () => { 42;}; console.log(noReturn());'),
    invalid('function noReturn() { return; }; console.log(noReturn());'),
    invalid(
      'var noReturn = function () { let x = () => { return 42 }; }; console.log(noReturn());',
    ),
    invalid('var funcExpr = function noReturn () { 1; console.log(noReturn()); };'),
    invalid('var noReturn = () => { var x = () => {return 1}  }; x = noReturn();'),
    invalid('declare function noReturn(): never; let x = noReturn();'),
    invalid('declare function noReturn(): void; let x = noReturn();'),
    invalid('declare function noReturn(): undefined; let x = noReturn();'),
  ],
});

function invalidPrefixWithFunction(
  code: string,
  functionName: string = 'noReturn',
): { code: string; errors: RuleTester.TestCaseError[] } {
  return {
    code: 'function noReturn() { 1;} ' + code,
    errors: [
      {
        messageId: 'removeUseOfOutput',
        data: {
          name: functionName,
        },
      },
    ],
  };
}

function invalid(code: string): { code: string; errors: RuleTester.TestCaseError[] } {
  return {
    code,
    errors: [
      {
        messageId: 'removeUseOfOutput',
        data: {
          name: 'noReturn',
        },
      },
    ],
  };
}
