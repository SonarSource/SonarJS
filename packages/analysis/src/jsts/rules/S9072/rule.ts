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
// https://sonarsource.github.io/rspec/#/rspec/S9072/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import {
  getVariableFromScope,
  isFunctionNode,
  isIdentifier,
  isTypeOnlyImport,
} from '../helpers/ast.js';
import { collectCallChain, unwrapChainExpression } from '../helpers/expect-call-chain.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import {
  getTypeFromTreeNode,
  isAnyOrUnknownType,
  isThenableOrThenableUnion,
} from '../helpers/type.js';
import { TEST_FUNCTION_NAMES } from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const messages = {
  nonCallable:
    '`{{matcher}}` can only test exceptions thrown by a function it invokes. Wrap the code that may throw in a function.',
  asyncCallback:
    'This exception assertion only catches synchronous throws; use a rejection assertion for the async callback.',
  wrapInCallback: 'Wrap the asserted operation in a synchronous callback.',
  useRejectionAssertion: 'Use a rejection assertion for the async callback.',
};

const EXPECT_FQNS = new Set(['@jest.globals.expect', 'vitest.expect', 'bun:test.expect']);
const SUPPORTED_MODULES = new Set(['@jest/globals', 'vitest', 'bun:test']);
const EXCEPTION_MATCHERS = new Set(['toThrow', 'toThrowError']);
const TEST_CONSTRUCTS = new Set([
  ...TEST_FUNCTION_NAMES,
  'before',
  'after',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
]);
const TEST_MODIFIERS = new Set(['only', 'concurrent', 'failing', 'sequential']);
const SECOND_TO_LAST_INDEX = -2;

type RequiredServices = NonNullable<ReturnType<typeof getRequiredServices>>;

type Assertion = {
  call: estree.CallExpression;
  root: estree.CallExpression;
  actual: estree.Expression;
  not: estree.Node | null;
  matcher: string;
};

function getRequiredServices(context: Rule.RuleContext) {
  const services = context.sourceCode.parserServices;
  return isRequiredParserServices(services) ? services : null;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, hasSuggestions: true }),

  create(context: Rule.RuleContext) {
    const services = getRequiredServices(context);
    if (!services) {
      return {};
    }

    return {
      CallExpression(node: estree.Node) {
        const assertion = getAssertion(context, node);
        if (!assertion) {
          return;
        }

        if (isExplicitAsyncCallback(assertion.actual)) {
          context.report({
            node: assertion.actual,
            messageId: 'asyncCallback',
            suggest: getAsyncCallbackSuggestion(context, assertion),
          });
          return;
        }

        if (!isDefinitelyNonCallable(assertion.actual, services)) {
          return;
        }

        context.report({
          node: assertion.actual,
          messageId: 'nonCallable',
          data: { matcher: assertion.matcher },
          suggest: getNonCallableSuggestion(context, assertion.actual, services),
        });
      },
    };
  },
};

function getAssertion(context: Rule.RuleContext, node: estree.Node): Assertion | null {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    !isIdentifier(node.callee.property) ||
    !EXCEPTION_MATCHERS.has(node.callee.property.name)
  ) {
    return null;
  }

  const parent = context.sourceCode.getAncestors(node).at(-1);
  if (
    (parent?.type === 'MemberExpression' && parent.object === node) ||
    (parent?.type === 'CallExpression' && parent.callee === node)
  ) {
    return null;
  }

  const chain = collectCallChain(node);
  if (!chain.complete) {
    return null;
  }
  const root = getExpectCall(context, node);
  if (!root || root.arguments.length === 0) {
    return null;
  }

  const rootMemberNames = getMemberNames(root.callee);
  const matcherSegments = chain.segments.slice(0, -rootMemberNames.length || undefined);
  if (matcherSegments.length !== 1 && matcherSegments.length !== 2) {
    return null;
  }

  const not = matcherSegments[1]?.name === 'not' ? matcherSegments[1].node : null;
  if (matcherSegments.length === 2 && not === null) {
    return null;
  }
  const notAncestors = not ? context.sourceCode.getAncestors(not) : [];
  const notMember = notAncestors.at(-1);
  const notCall = notAncestors.at(SECOND_TO_LAST_INDEX);
  if (
    notMember?.type === 'MemberExpression' &&
    notCall?.type === 'CallExpression' &&
    notCall.callee === notMember
  ) {
    return null;
  }

  const [actual] = root.arguments;
  if (!actual || actual.type === 'SpreadElement') {
    return null;
  }

  return { call: node, root, actual, not, matcher: node.callee.property.name };
}

function isExpectCall(context: Rule.RuleContext, callee: estree.Expression | estree.Super) {
  const fqn = getFullyQualifiedName(context, callee);
  if (fqn && EXPECT_FQNS.has(fqn)) {
    const runtime = isRuntimeBinding(context, callee);
    return runtime;
  }

  return isRequireExpectCall(callee) || isRequireExpectBinding(context, callee);
}

function getExpectCall(
  context: Rule.RuleContext,
  call: estree.CallExpression,
): estree.CallExpression | null {
  let current: estree.Node | estree.Super = call;
  while (
    current.type === 'CallExpression' ||
    current.type === 'MemberExpression' ||
    current.type === 'ChainExpression'
  ) {
    if (current.type === 'CallExpression') {
      if (isExpectCall(context, current.callee)) {
        return current;
      }
      current = unwrapChainExpression(current.callee);
    } else if (current.type === 'MemberExpression') {
      current = unwrapChainExpression(current.object);
    } else {
      current = current.expression;
    }
  }
  return null;
}

function isRuntimeBinding(context: Rule.RuleContext, node: estree.Node): boolean {
  const identifier = getRootIdentifier(node);
  if (!identifier) {
    // Inline `require('module').expect(...)` has no binding that can be type-only.
    return true;
  }

  const variable = getVariableFromScope(context.sourceCode.getScope(identifier), identifier.name);
  const importDefinition = variable?.defs.find(def => def.type === 'ImportBinding');
  if (importDefinition?.type === 'ImportBinding') {
    const declaration = importDefinition.parent;
    const specifier = importDefinition.node as estree.ImportSpecifier & { importKind?: string };
    return !isTypeOnlyImport(declaration) && specifier.importKind !== 'type';
  }

  return variable?.defs.some(def => def.type === 'Variable') ?? false;
}

function isRequireExpectCall(node: estree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.property, 'expect') &&
    isSupportedRequire(node.object)
  );
}

function isRequireExpectBinding(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromScope(context.sourceCode.getScope(node), node.name);
  for (const definition of variable?.defs ?? []) {
    if (definition.type !== 'Variable') {
      continue;
    }

    const declarator = definition.node;
    const initializer = declarator.init;
    if (!initializer || !isSupportedRequire(initializer)) {
      continue;
    }

    if (
      initializer.type === 'MemberExpression' &&
      !initializer.computed &&
      isIdentifier(initializer.property, 'expect')
    ) {
      return true;
    }

    if (declarator.id.type === 'ObjectPattern') {
      return declarator.id.properties.some(property => {
        if (
          property.type !== 'Property' ||
          property.computed ||
          property.key.type !== 'Identifier'
        ) {
          return false;
        }
        return (
          property.key.name === 'expect' &&
          property.value.type === 'Identifier' &&
          property.value.name === node.name
        );
      });
    }
  }

  return false;
}

function isSupportedRequire(node: estree.Node | null | undefined): boolean {
  const requireCall = getRequireCall(node);
  const moduleName = requireCall?.arguments[0];
  return (
    moduleName?.type === 'Literal' &&
    typeof moduleName.value === 'string' &&
    SUPPORTED_MODULES.has(moduleName.value)
  );
}

function getRequireCall(node: estree.Node | null | undefined): estree.CallExpression | null {
  if (
    node?.type === 'CallExpression' &&
    isIdentifier(node.callee, 'require') &&
    node.arguments.length === 1
  ) {
    return node;
  }
  if (node?.type === 'MemberExpression') {
    return getRequireCall(node.object);
  }
  return null;
}

function getRootIdentifier(node: estree.Node): estree.Identifier | null {
  let current = node;
  while (current.type === 'MemberExpression' || current.type === 'ChainExpression') {
    current = current.type === 'MemberExpression' ? current.object : current.expression;
  }
  return current.type === 'Identifier' ? current : null;
}

function getMemberNames(node: estree.Node): string[] {
  const names: string[] = [];
  let current = node;
  while (
    current.type === 'MemberExpression' &&
    !current.computed &&
    isIdentifier(current.property)
  ) {
    names.unshift(current.property.name);
    current = current.object;
  }
  return names;
}

function isExplicitAsyncCallback(
  node: estree.Expression,
): node is estree.ArrowFunctionExpression | estree.FunctionExpression {
  return (
    (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
    node.async === true &&
    !node.generator
  );
}

function isDefinitelyNonCallable(node: estree.Expression, services: RequiredServices): boolean {
  const type = getTypeFromTreeNode(node, services);
  if (isAnyOrUnknownType(type) || isUncertainType(type)) {
    return false;
  }

  const types = type.isUnion() ? type.types : [type];
  return types.every(constituent => {
    if (isAnyOrUnknownType(constituent) || isUncertainType(constituent)) {
      return false;
    }
    return constituent.getCallSignatures().length === 0;
  });
}

function isUncertainType(type: ts.Type): boolean {
  const flags = type.getFlags();
  return (
    (flags &
      (ts.TypeFlags.Any |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.TypeParameter |
        ts.TypeFlags.IndexedAccess |
        ts.TypeFlags.Conditional |
        ts.TypeFlags.Substitution)) !==
    0
  );
}

function getNonCallableSuggestion(
  context: Rule.RuleContext,
  actual: estree.Expression,
  services: RequiredServices,
): Rule.SuggestionReportDescriptor[] | undefined {
  if (actual.type !== 'CallExpression' && actual.type !== 'NewExpression') {
    return undefined;
  }
  if (isThenableOrThenableUnion(actual, services)) {
    return undefined;
  }

  return [
    {
      messageId: 'wrapInCallback',
      fix: fixer => fixer.replaceText(actual, `() => ${context.sourceCode.getText(actual)}`),
    },
  ];
}

function getAsyncCallbackSuggestion(
  context: Rule.RuleContext,
  assertion: Assertion,
): Rule.SuggestionReportDescriptor[] | undefined {
  const callback = getEnclosingAsyncTestCallback(context, assertion.call);
  if (!callback || !isStandaloneExpression(context, assertion.call)) {
    return undefined;
  }

  const target = assertion.not ?? (assertion.call.callee as estree.MemberExpression).property;
  return [
    {
      messageId: 'useRejectionAssertion',
      fix: fixer => [
        fixer.insertTextBefore(assertion.root, 'await '),
        fixer.replaceText(assertion.actual, `(${context.sourceCode.getText(assertion.actual)})()`),
        fixer.insertTextBefore(target, 'rejects.'),
      ],
    },
  ];
}

function getEnclosingAsyncTestCallback(
  context: Rule.RuleContext,
  node: estree.Node,
): estree.Function | null {
  const ancestors = context.sourceCode.getAncestors(node);
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const ancestor = ancestors[index];
    if (!isFunctionNode(ancestor)) {
      continue;
    }

    const parent = ancestors[index - 1];
    if (ancestor.type === 'FunctionDeclaration') {
      return null;
    }
    const callback = ancestor;
    if (
      callback.async !== true ||
      callback.params[0]?.type === 'Identifier' ||
      parent?.type !== 'CallExpression' ||
      !parent.arguments.includes(callback) ||
      !isRecognizedTestOrHook(context, parent)
    ) {
      return null;
    }
    return callback;
  }
  return null;
}

function isStandaloneExpression(context: Rule.RuleContext, node: estree.Node): boolean {
  const parent = context.sourceCode.getAncestors(node).at(-1);
  return parent?.type === 'ExpressionStatement';
}

function isRecognizedTestOrHook(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  const fqn = getFullyQualifiedName(context, call.callee);
  if (fqn) {
    for (const moduleName of SUPPORTED_MODULES) {
      const prefix = `${moduleName.replaceAll('/', '.')}.`;
      if (!fqn.startsWith(prefix)) {
        continue;
      }
      const parts = fqn.slice(prefix.length).split('.');
      return (
        TEST_CONSTRUCTS.has(parts[0]) &&
        parts.slice(1).every(modifier => TEST_MODIFIERS.has(modifier)) &&
        isRuntimeBinding(context, call.callee)
      );
    }
  }

  return false;
}
