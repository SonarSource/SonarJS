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
import type { Rule } from 'eslint';
import type estree from 'estree';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { type FunctionNodeType } from '../helpers/ast.js';
import { createComplexityTracker } from './complexity.js';
import {
  getImmediatelyConstructedFunction,
  getImmediatelyInvokedFunction,
} from './immediate-invocation.js';
import { createModuleInitializerTracker } from './module-initializers.js';

const immediateRule: Rule.RuleModule = {
  create(context) {
    function report(node: estree.Node | undefined) {
      if (node) {
        context.report({ node, message: 'The function runs immediately.' });
      }
    }
    return {
      CallExpression(node: estree.Node) {
        report(getImmediatelyInvokedFunction((node as estree.CallExpression).callee));
      },
      NewExpression(node: estree.Node) {
        report(getImmediatelyConstructedFunction((node as estree.NewExpression).callee));
      },
      TaggedTemplateExpression(node: estree.Node) {
        report(getImmediatelyInvokedFunction((node as estree.TaggedTemplateExpression).tag));
      },
    };
  },
};

const moduleRule: Rule.RuleModule = {
  create(context) {
    const tracker = createModuleInitializerTracker(context);
    const functions: estree.Node[] = [];
    return {
      FunctionExpression(node: estree.Node) {
        functions.push(node);
      },
      CallExpression(node: estree.Node) {
        tracker.recordCall(node as estree.CallExpression);
      },
      AssignmentExpression(node: estree.Node) {
        tracker.recordWrite((node as estree.AssignmentExpression).left);
      },
      'Program:exit': () => {
        const excluded = tracker.getExcludedFactories(() => true);
        for (const node of functions) {
          if (excluded.has(node)) {
            context.report({ node, message: 'The loader factory is excluded.' });
          }
        }
      },
    };
  },
};

const complexityRule: Rule.RuleModule = {
  create(context) {
    const tracker = createComplexityTracker(context);
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (node: estree.Node) =>
        tracker.enterFunction(node as FunctionNodeType),
      ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression):exit': () =>
        tracker.leaveFunction(),
      IfStatement(node: estree.Node) {
        tracker.addBranch(node);
      },
      'Program:exit': () => tracker.reportOverThreshold(2, () => false),
    };
  },
};

describe('S1541 components', () => {
  const tester = new DefaultParserRuleTester();

  it('recognizes only directly executed function literals', () => {
    tester.run('immediate invocation', immediateRule, {
      valid: [
        'consume(function () {})',
        '(function* () {})()',
        'new (async function () {})()',
        'new (() => {})()',
        '(function () {}).call()',
      ].map(code => ({ code })),
      invalid: [
        '(function () {})()',
        '(0, () => {})()',
        '(function () {})`tag`',
        'new (function () {})()',
      ].map(code => ({ code, errors: [{ message: 'The function runs immediately.' }] })),
    });
  });

  it('accepts only supported loader calls with stable paths', () => {
    tester.run('module initializers', moduleRule, {
      valid: [
        'define = other; define([], function () {})',
        'sap.ui.define([], function () {}); sap.ui = other',
        'sap.ui.define([], () => {})',
        'define?.([], function () {})',
      ].map(code => ({ code })),
      invalid: [
        'define([], function () {})',
        'sap.ui.define([], function () {})',
        'function local(define) { define = other; } define([], function () {})',
      ].map(code => ({
        code,
        errors: [{ message: 'The loader factory is excluded.' }],
      })),
    });
  });

  it('counts branches within each function', () => {
    tester.run('complexity tracking', complexityRule, {
      valid: [{ code: 'function outer() { function inner() { if (a) {} } if (b) {} }' }],
      invalid: [
        'function outer() { if (a) {} if (b) {} }',
        'function outer() { function inner() { if (a) {} if (b) {} } }',
      ].map(code => ({ code, errors: [{ message: /complexity of 3/ }] })),
    });
  });
});
