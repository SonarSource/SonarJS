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
// https://sonarsource.github.io/rspec/#/rspec/S8686/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { importsOrDependsOnModule } from '../helpers/module.js';
import * as Mocha from '../helpers/mocha.js';
import * as meta from './generated-meta.js';

const EXPECT_MODULES = ['vitest', 'bun:test', '@jest/globals', '@playwright/test'];
const EXPECT_GLOBAL_RUNNERS = ['jest', '@playwright/test'];

const conditionalAssertionMessage =
  'Refactor this test so this assertion is always evaluated, or split the test case.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      conditionalAssertion: conditionalAssertionMessage,
    },
  }),
  create(context: Rule.RuleContext) {
    if (!importsOrDependsOnModule(context, EXPECT_MODULES, EXPECT_GLOBAL_RUNNERS)) {
      return {};
    }

    let testCaseDepth = 0;
    let conditionalDepth = 0;
    let promiseCatchDepth = 0;
    const catchCallbacks = new WeakSet<estree.Node>();

    function enterConditional() {
      if (testCaseDepth > 0) {
        conditionalDepth++;
      }
    }

    function exitConditional() {
      if (testCaseDepth > 0) {
        conditionalDepth--;
      }
    }

    return {
      CallExpression(node: estree.CallExpression) {
        if (Mocha.isTestCase(node)) {
          testCaseDepth++;
        }
        if (isCatchCall(node)) {
          const [callback] = node.arguments;
          if (isFunctionNode(callback)) {
            catchCallbacks.add(callback);
          }
        }
        if (
          isExpectCall(node) &&
          testCaseDepth > 0 &&
          isConditional() &&
          !isGuardedAssertion(node, context)
        ) {
          context.report({
            node,
            messageId: 'conditionalAssertion',
          });
        }
      },
      'CallExpression:exit'(node: estree.CallExpression) {
        if (Mocha.isTestCase(node)) {
          testCaseDepth--;
          if (testCaseDepth === 0) {
            conditionalDepth = 0;
            promiseCatchDepth = 0;
          }
        }
      },
      IfStatement: enterConditional,
      'IfStatement:exit': exitConditional,
      SwitchStatement: enterConditional,
      'SwitchStatement:exit': exitConditional,
      ConditionalExpression: enterConditional,
      'ConditionalExpression:exit': exitConditional,
      LogicalExpression: enterConditional,
      'LogicalExpression:exit': exitConditional,
      CatchClause: enterConditional,
      'CatchClause:exit': exitConditional,
      ':function'(node: estree.Node) {
        if (catchCallbacks.has(node)) {
          promiseCatchDepth++;
        }
      },
      ':function:exit'(node: estree.Node) {
        if (catchCallbacks.has(node)) {
          promiseCatchDepth--;
        }
      },
    };

    function isConditional(): boolean {
      return conditionalDepth > 0 || promiseCatchDepth > 0;
    }
  },
};

function isExpectCall(node: estree.CallExpression): boolean {
  return node.callee.type === 'Identifier' && node.callee.name.startsWith('expect');
}

function isCatchCall(node: estree.CallExpression): boolean {
  return (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'catch'
  );
}

function isFunctionNode(
  node: estree.Node | estree.SpreadElement | null | undefined,
): node is estree.Node {
  return node?.type === 'FunctionExpression' || node?.type === 'ArrowFunctionExpression';
}

function isGuardedAssertion(node: estree.CallExpression, context: Rule.RuleContext): boolean {
  const ancestors = context.sourceCode.getAncestors(node) as estree.Node[];
  return (
    isInCatchWithExplicitFailureGuard(ancestors, context) ||
    isInPromiseCatchWithExplicitFailureGuard(ancestors, context) ||
    hasAssertionCountGuard(ancestors, node, context) ||
    isInEnvironmentSpecificBranch(ancestors, context) ||
    isInDataMatrixBranch(ancestors, context) ||
    isInExhaustiveAssertionBranches(ancestors, context) ||
    isInCollectionFilteringLogicalAssertion(ancestors)
  );
}

function isInCatchWithExplicitFailureGuard(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): boolean {
  const catchClause = findLastAncestor(ancestors, ancestor => ancestor.type === 'CatchClause');
  if (!catchClause) {
    return false;
  }
  const tryStatement = findLastAncestor(ancestors, ancestor => ancestor.type === 'TryStatement') as
    | estree.TryStatement
    | undefined;
  if (!tryStatement) {
    return false;
  }
  const tryBlockText = context.sourceCode.getText(tryStatement.block);
  return (
    hasExpectCall(tryStatement.block, context) ||
    /\b(?:new\s+FormData|vi\.wait(?:For|Until))\b/.test(tryBlockText) ||
    /\bexpect\.(?:unreachable|fail)\s*\(/.test(tryBlockText) ||
    /\bexpect\s*\(\s*(?:true|false)\s*\)\s*\.\s*toBe\s*\(\s*(?:false|true)\s*\)/.test(
      tryBlockText,
    ) ||
    hasPostCatchFailureGuard(ancestors, tryStatement, context)
  );
}

function isInPromiseCatchWithExplicitFailureGuard(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): boolean {
  const catchCall = findLastAncestor(
    ancestors,
    ancestor =>
      ancestor.type === 'CallExpression' && isCatchCall(ancestor as estree.CallExpression),
  ) as estree.CallExpression | undefined;
  if (!catchCall || !catchCall.range) {
    return false;
  }

  const catchText = context.sourceCode.getText(catchCall);
  return (
    /\bexpect\s*\(\s*(?:true|false)\s*\)\s*\.\s*toBe\s*\(\s*(?:false|true)\s*\)/.test(catchText) &&
    hasPreviousThenAssertion(catchCall, context)
  );
}

function hasPreviousThenAssertion(
  catchCall: estree.CallExpression,
  context: Rule.RuleContext,
): boolean {
  const callee = catchCall.callee;
  if (
    callee.type !== 'MemberExpression' ||
    callee.object.type !== 'CallExpression' ||
    callee.object.callee.type !== 'MemberExpression' ||
    callee.object.callee.property.type !== 'Identifier' ||
    callee.object.callee.property.name !== 'then'
  ) {
    return false;
  }
  return hasExpectCall(callee.object, context);
}

function hasPostCatchFailureGuard(
  ancestors: estree.Node[],
  tryStatement: estree.TryStatement,
  context: Rule.RuleContext,
): boolean {
  const testCase = findLastAncestor(
    ancestors,
    ancestor =>
      ancestor.type === 'CallExpression' && Mocha.isTestCase(ancestor as estree.CallExpression),
  );
  if (!testCase?.range || !tryStatement.range) {
    return false;
  }
  const textAfterTry = context.sourceCode.text.slice(tryStatement.range[1], testCase.range[1]);
  return /\bexpect\s*\([^)]*\)\s*\.\s*toBe\s*\(\s*(?:true|false|null|undefined)\s*\)/.test(
    textAfterTry,
  );
}

function hasAssertionCountGuard(
  ancestors: estree.Node[],
  node: estree.CallExpression,
  context: Rule.RuleContext,
): boolean {
  const testCase = findLastAncestor(
    ancestors,
    ancestor =>
      ancestor.type === 'CallExpression' && Mocha.isTestCase(ancestor as estree.CallExpression),
  );
  if (!testCase) {
    return false;
  }
  if (!testCase.range || !node.range) {
    return false;
  }
  const textBeforeAssertion = context.sourceCode.text.slice(testCase.range[0], node.range[0]);
  return /\bexpect\s*\.\s*(?:assertions|hasAssertions)\s*\(/.test(textBeforeAssertion);
}

function isInEnvironmentSpecificBranch(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): boolean {
  return ancestors.some(ancestor => {
    if (ancestor.type === 'IfStatement' || ancestor.type === 'ConditionalExpression') {
      return isEnvironmentCondition(context.sourceCode.getText(ancestor.test));
    }
    if (ancestor.type === 'SwitchStatement') {
      return isEnvironmentCondition(context.sourceCode.getText(ancestor.discriminant));
    }
    if (ancestor.type === 'LogicalExpression') {
      return isEnvironmentCondition(context.sourceCode.getText(ancestor.left));
    }
    return false;
  });
}

function isEnvironmentCondition(conditionText: string): boolean {
  return /\b(?:process|import\.meta|__WIN32__|isVm|isBrowser|isV8Provider|isNativeRunner|server\.(?:provider|platform)|provider\.name|project\.name|instances|rolldownVersion|config\.pool)\b/.test(
    conditionText,
  );
}

function isInDataMatrixBranch(ancestors: estree.Node[], context: Rule.RuleContext): boolean {
  return ancestors.some(ancestor => {
    if (ancestor.type === 'IfStatement' || ancestor.type === 'ConditionalExpression') {
      return isDataMatrixCondition(context.sourceCode.getText(ancestor.test));
    }
    if (ancestor.type === 'SwitchStatement') {
      return isDataMatrixCondition(context.sourceCode.getText(ancestor.discriminant));
    }
    return false;
  });
}

function isDataMatrixCondition(conditionText: string): boolean {
  return /\b(?:traceFile|project|browser|provider|name)\b/.test(conditionText);
}

function isInExhaustiveAssertionBranches(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): boolean {
  return ancestors.some(ancestor => {
    if (ancestor.type === 'IfStatement' && ancestor.alternate) {
      return (
        hasExpectCall(ancestor.consequent, context) && hasExpectCall(ancestor.alternate, context)
      );
    }
    if (ancestor.type === 'ConditionalExpression') {
      return (
        hasExpectCall(ancestor.consequent, context) && hasExpectCall(ancestor.alternate, context)
      );
    }
    return false;
  });
}

function hasExpectCall(node: estree.Node, context: Rule.RuleContext): boolean {
  return /\bexpect\w*\s*\(/.test(context.sourceCode.getText(node));
}

function isInCollectionFilteringLogicalAssertion(ancestors: estree.Node[]): boolean {
  return (
    ancestors.some(ancestor => ancestor.type === 'LogicalExpression') &&
    ancestors.some(
      ancestor =>
        ancestor.type === 'CallExpression' &&
        ancestor.callee.type === 'MemberExpression' &&
        !ancestor.callee.computed &&
        ancestor.callee.property.type === 'Identifier' &&
        ['forEach', 'map', 'filter', 'reduce', 'every', 'some'].includes(
          ancestor.callee.property.name,
        ),
    )
  );
}

function findLastAncestor(
  ancestors: estree.Node[],
  predicate: (ancestor: estree.Node) => boolean,
): estree.Node | undefined {
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const ancestor = ancestors[index];
    if (predicate(ancestor)) {
      return ancestor;
    }
  }
  return undefined;
}
