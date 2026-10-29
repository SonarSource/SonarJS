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
import type { Rule } from 'eslint';
import {
  getUniqueWriteReference,
  getVariableFromName,
  isRequireModule,
  unwrapTypeScriptExpression,
} from '../ast.js';
import { getFullyQualifiedName } from '../module.js';
import { getFullyQualifiedNameTS } from '../module-ts.js';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

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

  // A Supertest chain can include another `.expect(...)` before its final `.expect(...)`.
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
 * import or `require('supertest')`. Agent factories must use a named `agent` import.
 */
function isLocalFactoryAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  const identifier = getFactoryIdentifier(node);
  if (!identifier) {
    return false;
  }
  const factory = resolveLocalFactory(context, identifier);
  return factory !== undefined && isSupertestFactory(context, factory);
}

function isSupertestFactory(context: Rule.RuleContext, factory: estree.Function): boolean {
  if (factory.params.length !== 0 || factory.async || factory.generator) {
    return false;
  }
  const returned = getReturnedCall(factory);
  return returned !== undefined && isSupertestCall(context, returned);
}

function getReturnedCall(factory: estree.Function): estree.CallExpression | undefined {
  const expression = getReturnedExpression(factory);
  if (!expression) {
    return undefined;
  }
  const returned = unwrapTypeScriptExpression(expression);
  return returned.type === 'CallExpression' && !returned.optional ? returned : undefined;
}

function isSupertestCall(context: Rule.RuleContext, returned: estree.CallExpression): boolean {
  const fqn = getFullyQualifiedName(context, returned);
  if (fqn !== 'supertest' && fqn !== 'supertest.agent') {
    return false;
  }
  const callee = unwrapTypeScriptExpression(returned.callee);
  // Example: const http = () => request(app); http().get('/').expect(200);
  // Example: import { agent } from 'supertest'; const http = () => agent(app);
  return hasDirectSupertestOrigin(context, callee, fqn);
}

type SupertestVariable = NonNullable<ReturnType<typeof getVariableFromName>>;
type SupertestDefinition = SupertestVariable['defs'][number];

/** Accept a direct Supertest import or an unchanged `require('supertest')` binding. */
function hasDirectSupertestOrigin(
  context: Rule.RuleContext,
  callee: estree.Node,
  fqn: string,
): boolean {
  if (callee.type !== 'Identifier') {
    // Example: const http = () => require('supertest')(app);
    return fqn === 'supertest' && isStableSupertestRequire(context, callee);
  }
  const variable = getVariableFromName(context, callee.name, callee);
  if (variable?.defs.length !== 1) {
    return false;
  }
  const definition = variable.defs[0];
  if (definition.type === 'ImportBinding') {
    return isStableSupertestImport(variable, definition, fqn);
  }
  return isStableSupertestRequireBinding(context, variable, definition, fqn);
}

function isStableSupertestImport(
  variable: SupertestVariable,
  definition: SupertestDefinition,
  fqn: string,
): boolean {
  const specifier = definition.node;
  if (specifier.type === 'ImportSpecifier') {
    const imported = specifier.imported;
    const name = imported.type === 'Identifier' ? imported.name : imported.value;
    return (
      definition.parent?.type === 'ImportDeclaration' &&
      definition.parent.source.value === 'supertest' &&
      (name === 'default' || name === 'agent') &&
      !variable.references.some(reference => reference.isWrite())
    );
  }
  // Example: import * as request from 'supertest'; const http = () => request(app);
  return (
    fqn === 'supertest' &&
    (specifier.type === 'ImportDefaultSpecifier' ||
      specifier.type === 'ImportNamespaceSpecifier') &&
    !variable.references.some(reference => reference.isWrite())
  );
}

function isStableSupertestRequireBinding(
  context: Rule.RuleContext,
  variable: SupertestVariable,
  definition: SupertestDefinition,
  fqn: string,
): boolean {
  if (definition.type !== 'Variable' || fqn !== 'supertest') {
    return false;
  }
  const { id, init } = definition.node as estree.VariableDeclarator;
  // Example: const client = require('supertest'); const http = () => client(app);
  return (
    id.type === 'Identifier' &&
    init != null &&
    getUniqueWriteReference(variable) === init &&
    isStableSupertestRequire(context, init)
  );
}

function isStableSupertestRequire(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression' || !isRequireModule(node, 'supertest')) {
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

/**
 * Resolve `http()` only when `http` names one local function definition.
 * Accept `function http() { ... }` with no writes to `http`.
 * Accept `const http = () => ...` or `let http = function () { ... }` with one initializer write.
 * Reject imported functions, aliases, and reassigned factories.
 */
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
