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
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import type ts from 'typescript';
import { getUniqueWriteReference, getVariableFromName } from '../helpers/ast.js';
import { getFullyQualifiedName, isRequire } from '../helpers/module.js';

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
 * The factory must have no parameters and use a stable Supertest import or `require('supertest')`.
 */
export function isLocalFactoryAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  const identifier = getFactoryIdentifier(node);
  if (!identifier) {
    return false;
  }
  const factory = resolveLocalFactory(context, identifier);
  if (factory?.params.length !== 0 || factory?.async || factory?.generator) {
    return false;
  }
  const returned = getReturnedExpression(factory);
  return (
    returned?.type === 'CallExpression' &&
    getFullyQualifiedName(context, returned) === 'supertest' &&
    hasDirectSupertestOrigin(context, returned.callee)
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

export function isTSLocalFactoryAssertion(
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
 * Reject computed members such as `http()['post']('/').expect(201)` and `.use(...)` calls.
 */
function getFactoryIdentifier(node: estree.Node): estree.Identifier | undefined {
  if (node.type !== 'CallExpression') {
    return undefined;
  }
  let current = node;
  let methodCount = 0;
  while (current.callee.type === 'MemberExpression') {
    const { callee } = current;
    if (
      current.optional ||
      callee.optional ||
      callee.computed ||
      callee.property.type !== 'Identifier' ||
      callee.object.type !== 'CallExpression' ||
      (methodCount === 0 && callee.property.name !== 'expect') ||
      // Plugins can replace expect.
      callee.property.name === 'use'
    ) {
      return undefined;
    }
    methodCount++;
    current = callee.object;
  }
  return methodCount >= 2 &&
    !current.optional &&
    current.arguments.length === 0 &&
    current.callee.type === 'Identifier'
    ? current.callee
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
