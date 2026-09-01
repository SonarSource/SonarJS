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
// https://sonarsource.github.io/rspec/#/rspec/S9162/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../helpers/ancestor.js';
import {
  getVariableFromName,
  isMethodCall,
  isStringLiteral,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import { extractChaiAssertion } from '../helpers/assertions-chai.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isTestRelatedFile } from '../helpers/test-file-pattern.js';
import { isAngularProject } from '../helpers/dependency-manifests/dependencies.js';
import * as meta from './generated-meta.js';

const messages = {
  retryAssertions:
    'Assertions in `.then()` run only once; use `.should()` to retry them and avoid flaky tests.',
  useShould: 'Replace `.then()` with retryable `.should()`.',
};

type RetrySafeKind = 'value' | 'yielded' | 'string' | 'record';

const STRING_METHODS = new Set(['trim', 'toLowerCase', 'toUpperCase']);
const NO_RETRY_SAFE_BINDINGS = new Map<string, RetrySafeKind>();
const CYPRESS_DOM_QUERY_COMMANDS = new Set([
  'children',
  'closest',
  'contains',
  'eq',
  'filter',
  'find',
  'first',
  'focused',
  'get',
  'last',
  'next',
  'nextAll',
  'nextUntil',
  'not',
  'parent',
  'parents',
  'parentsUntil',
  'prev',
  'prevAll',
  'prevUntil',
  'root',
  'shadow',
  'siblings',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, hasSuggestions: true }),
  create(context: Rule.RuleContext): Rule.RuleListener {
    if (
      !isTestRelatedFile(context.filename, context.settings?.testFileExtensions as string[], () =>
        isAngularProject(context),
      )
    ) {
      return {};
    }

    return {
      CallExpression(node: estree.Node): void {
        const call = node as estree.CallExpression;
        if (!isCandidateThenCall(context, call)) {
          return;
        }
        const [callback] = call.arguments;
        if (!isAssertionOnlyCallback(context, callback)) {
          return;
        }
        context.report({
          node: call.callee.property,
          messageId: 'retryAssertions',
          suggest: [
            {
              messageId: 'useShould',
              fix: (fixer: Rule.RuleFixer): Rule.Fix =>
                fixer.replaceText(call.callee.property, 'should'),
            },
          ],
        });
      },
    };
  },
};

function isCandidateThenCall(
  context: Rule.RuleContext,
  call: estree.CallExpression,
): call is estree.CallExpression & {
  callee: estree.MemberExpression & { property: estree.Identifier };
} {
  return (
    isMethodCall(call) &&
    !isOptionalCall(call) &&
    !call.callee.optional &&
    !hasTypeArguments(call) &&
    call.callee.property.name === 'then' &&
    call.arguments.length === 1 &&
    isRetryableCypressDomQueryChain(context, call.callee.object)
  );
}

function isRetryableCypressDomQueryChain(context: Rule.RuleContext, node: estree.Node): boolean {
  let current: estree.Node = node;
  let sawQuery = false;
  while (true) {
    current = unwrapTypeScriptExpression(current);
    if (current.type === 'ChainExpression') {
      current = current.expression;
      continue;
    }
    if (current.type !== 'CallExpression') {
      break;
    }
    if (!isRetryableDomQueryCall(current)) {
      return false;
    }
    sawQuery = true;
    current = current.callee.object;
  }
  return sawQuery && isUnshadowedGlobalCy(context, current);
}

function isRetryableDomQueryCall(call: estree.CallExpression): call is estree.CallExpression & {
  callee: estree.MemberExpression & { property: estree.Identifier };
} {
  return (
    isMethodCall(call) &&
    !isOptionalCall(call) &&
    CYPRESS_DOM_QUERY_COMMANDS.has(call.callee.property.name) &&
    call.arguments.every((argument, index) =>
      call.callee.property.name === 'get' && index === 0
        ? isSelectorArgument(argument)
        : isRetrySafeQueryArgument(argument),
    )
  );
}

function isUnshadowedGlobalCy(context: Rule.RuleContext, node: estree.Node): boolean {
  const root = unwrapTypeScriptExpression(node);
  if (root.type !== 'Identifier' || root.name !== 'cy') {
    return false;
  }
  const variable = getVariableFromName(context, 'cy', root);
  return !variable || variable.defs.length === 0;
}

function isSelectorArgument(
  argument: estree.CallExpression['arguments'][number] | undefined,
): boolean {
  return (
    argument != null &&
    argument.type !== 'SpreadElement' &&
    ((isStringLiteral(argument) && !argument.value.startsWith('@')) || isTemplateSelector(argument))
  );
}

function isTemplateSelector(argument: estree.Node): boolean {
  if (argument.type !== 'TemplateLiteral') {
    return false;
  }
  const prefix = argument.quasis[0]?.value.cooked;
  return prefix != null && prefix.length > 0 && !prefix.startsWith('@');
}

function isRetrySafeQueryArgument(argument: estree.CallExpression['arguments'][number]): boolean {
  return (
    argument.type !== 'SpreadElement' && retrySafeKind(argument, NO_RETRY_SAFE_BINDINGS) !== null
  );
}

function isOptionalCall(call: estree.CallExpression): boolean {
  return (call as estree.CallExpression & { optional?: boolean }).optional === true;
}

function hasTypeArguments(call: estree.CallExpression): boolean {
  const typescriptCall = call as estree.CallExpression & {
    typeArguments?: unknown;
    typeParameters?: unknown;
  };
  return typescriptCall.typeArguments != null || typescriptCall.typeParameters != null;
}

function findChainRoot(node: estree.Node): estree.Node {
  const unwrapped = unwrapTypeScriptExpression(node);
  if (unwrapped.type === 'MemberExpression') {
    return findChainRoot(unwrapped.object);
  }
  if (unwrapped.type === 'CallExpression') {
    return findChainRoot(unwrapped.callee);
  }
  if (unwrapped.type === 'ChainExpression') {
    return findChainRoot(unwrapped.expression);
  }
  return unwrapped;
}

function isAssertionOnlyCallback(
  context: Rule.RuleContext,
  callback: estree.CallExpression['arguments'][number] | undefined,
): boolean {
  if (
    !callback ||
    (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') ||
    callback.async ||
    callback.generator ||
    callback.body.type !== 'BlockStatement' ||
    callback.params.length !== 1 ||
    callback.params[0].type !== 'Identifier' ||
    callback.body.body.length === 0
  ) {
    return false;
  }

  const bindings = new Map<string, RetrySafeKind>([[callback.params[0].name, 'yielded']]);
  const yieldedBindings = new Set([callback.params[0].name]);
  let assertionCount = 0;
  let hasYieldedAssertion = false;
  for (const statement of callback.body.body) {
    if (statement.type === 'VariableDeclaration') {
      if (
        !acceptRetrySafeDeclaration(
          statement,
          bindings,
          yieldedBindings,
          context.sourceCode.visitorKeys,
        )
      ) {
        return false;
      }
      continue;
    }
    if (statement.type !== 'ExpressionStatement') {
      return false;
    }
    const assertion = extractChaiAssertion(context, statement.expression, true);
    if (
      !assertion ||
      (assertion.style !== 'chai-bdd' && assertion.style !== 'chai-assert') ||
      !isGlobalCypressAssertion(context, assertion.node) ||
      !assertionArgumentsAreRetrySafe(assertion.node, bindings)
    ) {
      return false;
    }
    hasYieldedAssertion ||= assertionUsesYieldedBinding(
      assertion,
      yieldedBindings,
      context.sourceCode.visitorKeys,
    );
    assertionCount++;
  }
  return assertionCount > 0 && hasYieldedAssertion;
}

function assertionUsesYieldedBinding(
  assertion: { actual: estree.Node; expected?: estree.Node },
  yieldedBindings: ReadonlySet<string>,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  return (
    usesYieldedBinding(assertion.actual, yieldedBindings, visitorKeys) ||
    (assertion.expected != null &&
      usesYieldedBinding(assertion.expected, yieldedBindings, visitorKeys))
  );
}

function assertionArgumentsAreRetrySafe(
  node: estree.Node,
  bindings: ReadonlyMap<string, RetrySafeKind>,
): boolean {
  const unwrapped = unwrapTypeScriptExpression(node);
  if (unwrapped.type === 'CallExpression') {
    if (
      unwrapped.arguments.some(
        (argument: estree.Expression | estree.SpreadElement): boolean =>
          argument.type === 'SpreadElement' || retrySafeKind(argument, bindings) === null,
      )
    ) {
      return false;
    }
    return assertionArgumentsAreRetrySafe(unwrapped.callee, bindings);
  }
  if (unwrapped.type === 'MemberExpression') {
    return assertionArgumentsAreRetrySafe(unwrapped.object, bindings);
  }
  return true;
}

function isGlobalCypressAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  const root = findChainRoot(node);
  if (root.type !== 'Identifier' || (root.name !== 'expect' && root.name !== 'assert')) {
    return false;
  }
  const variable = getVariableFromName(context, root.name, root);
  return !variable || variable.defs.length === 0;
}

function acceptRetrySafeDeclaration(
  declaration: estree.VariableDeclaration,
  bindings: Map<string, RetrySafeKind>,
  yieldedBindings: Set<string>,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  if (declaration.kind !== 'const') {
    return false;
  }
  for (const declarator of declaration.declarations) {
    if (declarator.id.type !== 'Identifier' || !declarator.init) {
      return false;
    }
    const kind = retrySafeKind(declarator.init, bindings);
    if (kind === null) {
      return false;
    }
    bindings.set(declarator.id.name, kind);
    if (usesYieldedBinding(declarator.init, yieldedBindings, visitorKeys)) {
      yieldedBindings.add(declarator.id.name);
    }
  }
  return true;
}

function usesYieldedBinding(
  expression: estree.Node,
  yieldedBindings: ReadonlySet<string>,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  const node = unwrapTypeScriptExpression(expression);
  if (node.type === 'Identifier') {
    return yieldedBindings.has(node.name);
  }
  if (node.type === 'MemberExpression') {
    return (
      usesYieldedBinding(node.object, yieldedBindings, visitorKeys) ||
      (node.computed && usesYieldedBinding(node.property, yieldedBindings, visitorKeys))
    );
  }
  if (node.type === 'Property') {
    return (
      usesYieldedBinding(node.value, yieldedBindings, visitorKeys) ||
      (node.computed && usesYieldedBinding(node.key, yieldedBindings, visitorKeys))
    );
  }
  return childrenOf(node, visitorKeys).some(child =>
    usesYieldedBinding(child, yieldedBindings, visitorKeys),
  );
}

function retrySafeKind(
  expression: estree.Node,
  bindings: ReadonlyMap<string, RetrySafeKind>,
): RetrySafeKind | null {
  const node = unwrapTypeScriptExpression(expression);
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? 'string' : 'value';
    case 'Identifier':
      return bindings.get(node.name) ?? null;
    case 'TemplateLiteral':
      return allRetrySafe(node.expressions, bindings) ? 'string' : null;
    case 'UnaryExpression':
      return retrySafeUnaryKind(node, bindings);
    case 'BinaryExpression':
    case 'LogicalExpression':
      return allRetrySafe([node.left, node.right], bindings) ? 'value' : null;
    case 'ConditionalExpression':
      return retrySafeConditionalKind(node, bindings);
    case 'ArrayExpression':
      return isRetrySafeArray(node, bindings) ? 'record' : null;
    case 'ObjectExpression':
      return isRetrySafeObject(node, bindings) ? 'record' : null;
    case 'MemberExpression':
      return retrySafeMemberKind(node, bindings);
    case 'CallExpression':
      return retrySafeCallKind(node, bindings);
    default:
      return null;
  }
}

function retrySafeUnaryKind(
  unary: estree.UnaryExpression,
  bindings: ReadonlyMap<string, RetrySafeKind>,
): RetrySafeKind | null {
  return unary.operator !== 'delete' && retrySafeKind(unary.argument, bindings) !== null
    ? 'value'
    : null;
}

function retrySafeConditionalKind(
  conditional: estree.ConditionalExpression,
  bindings: ReadonlyMap<string, RetrySafeKind>,
): RetrySafeKind | null {
  return allRetrySafe([conditional.test, conditional.consequent, conditional.alternate], bindings)
    ? 'value'
    : null;
}

function retrySafeMemberKind(
  member: estree.MemberExpression,
  bindings: ReadonlyMap<string, RetrySafeKind>,
): RetrySafeKind | null {
  return !member.computed && retrySafeKind(member.object, bindings) === 'record' ? 'value' : null;
}

function allRetrySafe(
  expressions: estree.Node[],
  bindings: ReadonlyMap<string, RetrySafeKind>,
): boolean {
  return expressions.every(
    (expression: estree.Node): boolean => retrySafeKind(expression, bindings) !== null,
  );
}

function isRetrySafeArray(
  array: estree.ArrayExpression,
  bindings: ReadonlyMap<string, RetrySafeKind>,
): boolean {
  return array.elements.every(
    (element: estree.Expression | estree.SpreadElement | null): boolean =>
      element === null ||
      (element.type !== 'SpreadElement' && retrySafeKind(element, bindings) !== null),
  );
}

function isRetrySafeObject(
  object: estree.ObjectExpression,
  bindings: ReadonlyMap<string, RetrySafeKind>,
): boolean {
  return object.properties.every(
    (property: estree.Property | estree.SpreadElement): boolean =>
      property.type === 'Property' &&
      property.kind === 'init' &&
      !property.computed &&
      !property.method &&
      !isPrototypeProperty(property) &&
      retrySafeKind(property.value, bindings) !== null,
  );
}

function isPrototypeProperty(property: estree.Property): boolean {
  return (
    (property.key.type === 'Identifier' && property.key.name === '__proto__') ||
    (property.key.type === 'Literal' && property.key.value === '__proto__')
  );
}

function retrySafeCallKind(
  call: estree.CallExpression,
  bindings: ReadonlyMap<string, RetrySafeKind>,
): RetrySafeKind | null {
  if (!isMethodCall(call) || call.arguments.length !== 0) {
    return null;
  }
  const receiverKind = retrySafeKind(call.callee.object, bindings);
  if (call.callee.property.name === 'text' && receiverKind === 'yielded') {
    return 'string';
  }
  if (STRING_METHODS.has(call.callee.property.name) && receiverKind === 'string') {
    return 'string';
  }
  return null;
}
