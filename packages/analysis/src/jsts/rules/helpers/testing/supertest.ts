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
import type { Rule, Scope, SourceCode } from 'eslint';
import {
  getUniqueWriteReference,
  getVariableFromName,
  unwrapTypeScriptExpression,
} from '../ast.js';
import { getFullyQualifiedName, isRequire } from '../module.js';
import { getFullyQualifiedNameTS } from '../module-ts.js';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

const stableAgentProperties = new WeakMap<SourceCode, boolean>();
const typeScriptExpressionWrappers = new Set([
  'TSNonNullExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]);

export function isAssertion(context: Rule.RuleContext, node: estree.Node) {
  const fqn = extractFQNForCallExpression(context, node);
  return isFQNAssertion(fqn) || isLocalFactoryAssertion(context, node);
}

export function isTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  context: Rule.RuleContext,
) {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const fqn = getFullyQualifiedNameTS(services, node);
  return isFQNAssertion(fqn) || isTSLocalFactoryAssertion(context, services, node);
}

function isFQNAssertion(fqn: string | null | undefined) {
  if (!fqn) {
    return false;
  }

  const names = fqn.split('.');

  /**
   * Supertest assertions end in `.expect(...)` after the request's HTTP verb and
   * any intermediate request methods, such as `.send(...)` or `.set(...)`.
   */
  return names.length >= 3 && names[0] === 'supertest' && names.at(-1) === 'expect';
}

function extractFQNForCallExpression(context: Rule.RuleContext, node: estree.Node) {
  if (node.type !== 'CallExpression') {
    return undefined;
  }

  return getFullyQualifiedName(context, node);
}

/**
 * Recognize an assertion on a request from a local factory that directly returns a Supertest call.
 *
 * ```js
 * import request from 'supertest';
 * const http = () => request(app);
 * http().get('/').expect(200); // accepted
 *
 * const fakeHttp = () => fakeRequest(app);
 * fakeHttp().get('/').expect(200); // rejected
 * ```
 *
 * The factory has no parameters. The `http()` call has no arguments and uses a stable Supertest
 * import or `require('supertest')`.
 */
function isLocalFactoryAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  const identifier = getFactoryIdentifier(node);
  if (!identifier) {
    return false;
  }
  const factory = resolveLocalFactory(context, identifier);
  if (factory?.params.length !== 0 || factory?.async || factory?.generator) {
    return false;
  }
  const expression = getReturnedExpression(factory);
  const returned = expression && unwrapTypeScriptExpression(expression);
  if (returned?.type !== 'CallExpression' || returned.optional) {
    return false;
  }
  const fqn = getFullyQualifiedName(context, returned);
  const callee = unwrapTypeScriptExpression(returned.callee);
  if (fqn === 'supertest') {
    return hasDirectSupertestOrigin(context, callee);
  }
  if (fqn !== 'supertest.agent' || !hasStableAgentProperty(context)) {
    return false;
  }
  if (callee.type === 'Identifier') {
    return hasDirectSupertestOrigin(context, callee);
  }
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    !callee.optional &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'agent' &&
    hasDirectSupertestOrigin(context, unwrapTypeScriptExpression(callee.object))
  );
}

/** Check all local module bindings because imports share the mutable agent property. */
function hasStableAgentProperty(context: Rule.RuleContext): boolean {
  const cached = stableAgentProperties.get(context.sourceCode);
  if (cached !== undefined) {
    return cached;
  }
  const stable = computeStableAgentProperty(context);
  stableAgentProperties.set(context.sourceCode, stable);
  return stable;
}

function computeStableAgentProperty(context: Rule.RuleContext): boolean {
  const scopes = context.sourceCode.scopeManager?.scopes;
  if (!scopes) {
    return false;
  }
  return scopes.every(
    scope => hasStableSupertestBindings(scope) && hasStableSupertestLoaders(scope),
  );
}

function hasStableSupertestBindings(scope: Scope.Scope): boolean {
  return scope.variables.every(variable => {
    if (!variable.defs.some(isSupertestModuleBinding)) {
      return true;
    }
    return variable.references.every(
      reference =>
        reference.init || isTypeOnlyReference(reference) || isStableLoaderUse(reference.identifier),
    );
  });
}

function isSupertestModuleBinding(definition: Scope.Definition): boolean {
  if (definition.type === 'ImportBinding') {
    return (
      definition.parent.source.value === 'supertest' &&
      (definition.node.type !== 'ImportSpecifier' ||
        (definition.node.imported.type === 'Identifier' &&
          definition.node.imported.name === 'default'))
    );
  }
  if (definition.type !== 'Variable') {
    return false;
  }
  return isSupertestRequire((definition.node as estree.VariableDeclarator).init);
}

function hasStableSupertestLoaders(scope: Scope.Scope): boolean {
  return [...scope.references, ...scope.through].every(isStableRequireUse);
}

function isStableRequireUse(reference: Scope.Reference): boolean {
  if (reference.identifier.name !== 'require') {
    return true;
  }
  const call = getParent(reference.identifier);
  if (!isSupertestRequire(call)) {
    return true;
  }
  const parent = getParent(call);
  return (
    parent?.type === 'VariableDeclarator' && parent.init === call && parent.id.type === 'Identifier'
  );
}

function isSupertestRequire(node: estree.Node | null | undefined): node is estree.CallExpression {
  return (
    node != null &&
    isRequire(node) &&
    node.arguments[0].type === 'Literal' &&
    node.arguments[0].value === 'supertest'
  );
}

function isStableLoaderUse(node: estree.Identifier): boolean {
  let current: estree.Node = node;
  let parent = getParent(current);
  while (parent) {
    const wrapper = parent as estree.Node & { type: string; expression?: estree.Node };
    if (!typeScriptExpressionWrappers.has(wrapper.type) || wrapper.expression !== current) {
      break;
    }
    current = parent;
    parent = getParent(current);
  }
  if (parent?.type === 'CallExpression' && parent.callee === current) {
    return true;
  }
  if (
    parent?.type !== 'MemberExpression' ||
    parent.computed ||
    parent.property.type !== 'Identifier' ||
    parent.property.name !== 'agent'
  ) {
    return false;
  }
  const call = (parent as estree.MemberExpression & { parent?: estree.Node }).parent;
  return call?.type === 'CallExpression' && call.callee === parent;
}

function getParent(node: estree.Node): estree.Node | undefined {
  return (node as estree.Node & { parent?: estree.Node }).parent;
}

function isTypeOnlyReference(reference: {
  identifier: estree.Identifier;
  isTypeReference?: boolean;
}) {
  const parent = getParent(reference.identifier);
  const parentType = (parent as { type: string } | undefined)?.type;
  return (
    reference.isTypeReference || parentType === 'TSQualifiedName' || parentType === 'TSTypeQuery'
  );
}

function hasDirectSupertestOrigin(context: Rule.RuleContext, callee: estree.Node): boolean {
  if (callee.type !== 'Identifier') {
    return isSupertestLoader(context, callee);
  }
  const variable = getVariableFromName(context, callee.name, callee);
  if (variable?.defs.length !== 1) {
    return false;
  }
  const definition = variable.defs[0];
  if (definition.type === 'ImportBinding') {
    return !variable.references.some(reference => reference.isWrite());
  }
  if (definition.type === 'Variable') {
    const { id, init } = definition.node as estree.VariableDeclarator;
    return (
      id.type === 'Identifier' &&
      init != null &&
      getUniqueWriteReference(variable) === init &&
      isSupertestLoader(context, init)
    );
  }
  return false;
}

function isSupertestLoader(context: Rule.RuleContext, node: estree.Node): boolean {
  if (
    !isRequire(node) ||
    node.arguments[0].type !== 'Literal' ||
    node.arguments[0].value !== 'supertest'
  ) {
    return false;
  }
  const variable = getVariableFromName(context, 'require', node.callee);
  if (variable?.defs.length) {
    return false;
  }
  const references = variable?.references ?? context.sourceCode.scopeManager?.globalScope?.through;
  return (
    references !== undefined &&
    !references.some(reference => reference.identifier.name === 'require' && reference.isWrite())
  );
}

function isTSLocalFactoryAssertion(
  context: Rule.RuleContext,
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  const mapped = services.tsNodeToESTreeNodeMap.get(node);
  return (
    mapped?.type === 'CallExpression' &&
    isLocalFactoryAssertion(context, mapped as estree.CallExpression)
  );
}

/**
 * Extract `http` from `http().post('/').send(data).expect(201)`.
 * Require at least two methods, no optional chaining, and no arguments to `http()`.
 * Reject computed members such as `http()['post']('/').expect(201)` and `.use(...)` calls.
 */
function getFactoryIdentifier(node: estree.Node): estree.Identifier | undefined {
  if (node.type !== 'CallExpression') {
    return undefined;
  }
  let current = node;
  let methodCount = 0;
  while (true) {
    const callee = unwrapTypeScriptExpression(current.callee);
    if (callee.type !== 'MemberExpression') {
      break;
    }
    const object = unwrapTypeScriptExpression(callee.object);
    if (
      current.optional ||
      callee.optional ||
      callee.computed ||
      callee.property.type !== 'Identifier' ||
      object.type !== 'CallExpression' ||
      (methodCount === 0 && callee.property.name !== 'expect') ||
      // Plugins can replace expect.
      callee.property.name === 'use'
    ) {
      return undefined;
    }
    methodCount++;
    current = object;
  }
  const callee = unwrapTypeScriptExpression(current.callee);
  return methodCount >= 2 &&
    !current.optional &&
    current.arguments.length === 0 &&
    callee.type === 'Identifier'
    ? callee
    : undefined;
}

function resolveLocalFactory(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): estree.Function | undefined {
  const variable = getVariableFromName(context, identifier.name, identifier);
  if (variable?.defs.length !== 1) {
    return undefined;
  }
  const definition = variable.defs[0];
  if (
    definition.type === 'FunctionName' &&
    definition.node.type === 'FunctionDeclaration' &&
    !variable.references.some(reference => reference.isWrite())
  ) {
    return definition.node;
  }
  if (definition.type === 'Variable') {
    const initializer = (definition.node as estree.VariableDeclarator).init;
    if (
      (initializer?.type === 'FunctionExpression' ||
        initializer?.type === 'ArrowFunctionExpression') &&
      getUniqueWriteReference(variable) === initializer
    ) {
      return initializer;
    }
  }
  return undefined;
}

/**
 * Accept an expression body or one `return request(app)` statement.
 * Reject setup statements and conditional returns, which do not identify one direct request call.
 */
function getReturnedExpression(factory: estree.Function): estree.Expression | undefined {
  if (factory.body.type !== 'BlockStatement') {
    return factory.body;
  }
  const [statement] = factory.body.body;
  return factory.body.body.length === 1 && statement.type === 'ReturnStatement'
    ? (statement.argument ?? undefined)
    : undefined;
}
