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
  resolveSingleWriteExpression,
  unwrapTypeScriptExpression,
} from '../ast.js';
import { getFullyQualifiedName } from '../module.js';
import { getFullyQualifiedNameTS } from '../module-ts.js';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

export function isAssertion(context: Rule.RuleContext, node: estree.Node) {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const fqn = getFullyQualifiedName(context, node);
  return isFQNAssertion(fqn) || new SupertestHelper(context).value(node).assertion;
}

export function isTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  context: Rule.RuleContext,
) {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const fqn = getFullyQualifiedNameTS(services, node);
  if (isFQNAssertion(fqn)) {
    return true;
  }
  const mapped = services.tsNodeToESTreeNodeMap.get(node);
  if (mapped && isFQNAssertion(getFullyQualifiedName(context, mapped as estree.Node))) {
    return true;
  }
  const value = mapped ? new SupertestHelper(context).value(mapped as estree.Node) : UNKNOWN;
  return value.assertion || (!value.plugin && isTypedExpect(services, node));
}

function isTypedExpect(services: ParserServicesWithTypeInformation, node: ts.CallExpression) {
  const callee = node.expression;
  if (
    ts.isCallChain(node) ||
    !ts.isPropertyAccessExpression(callee) ||
    callee.questionDotToken ||
    callee.name.text !== 'expect'
  ) {
    return false;
  }
  const declaration = services.program.getTypeChecker().getResolvedSignature(node)?.declaration;
  const filename = declaration?.getSourceFile().fileName.replaceAll('\\', '/');
  return (
    filename?.includes('/@types/supertest/') === true ||
    filename?.includes('/node_modules/supertest/') === true
  );
}

function isFQNAssertion(fqn: string | null | undefined) {
  if (!fqn) {
    return false;
  }

  const names = fqn.split('.');

  // A Supertest chain can include another `.expect(...)` before its final `.expect(...)`.
  return names.length >= 3 && names[0] === 'supertest' && names.at(-1) === 'expect';
}

type RequestKind = 'agent' | 'test';
type SupertestValue = { kind?: RequestKind; assertion: boolean; plugin?: boolean };
type ParameterValues = ReadonlyMap<SupertestVariable, SupertestValue>;
const UNKNOWN: SupertestValue = { assertion: false };
const PLUGIN_REQUEST: SupertestValue = { assertion: false, plugin: true };

/**
 * Follow request values through simple local helpers. Argument facts belong to a call, not to the
 * helper's AST: `check(realRequest)` must not make `check(fakeRequest)` an assertion in another test.
 * Keep the fallback limited to single-expression helpers; types handle richer helpers.
 */
class SupertestHelper {
  private readonly visiting = new Set<estree.Node>();

  constructor(private readonly context: Rule.RuleContext) {}

  value(node: estree.Node, argumentsByParameter: ParameterValues = new Map()): SupertestValue {
    node = unwrapTypeScriptExpression(node);
    if (this.visiting.has(node)) {
      return UNKNOWN;
    }
    this.visiting.add(node);
    try {
      if (node.type === 'Identifier') {
        return this.identifierValue(node, argumentsByParameter);
      }
      if (node.type !== 'CallExpression' || node.optional) {
        return UNKNOWN;
      }
      return this.callValue(node, argumentsByParameter);
    } finally {
      this.visiting.delete(node);
    }
  }

  private identifierValue(node: estree.Identifier, parameters: ParameterValues): SupertestValue {
    const variable = getVariableFromName(this.context, node.name, node);
    const parameterValue = variable ? parameters.get(variable) : undefined;
    if (parameterValue) {
      return { ...parameterValue, assertion: false };
    }
    const resolved = resolveSingleWriteExpression(this.context, node);
    // An assertion in an initializer ran at initialization, not when the variable is read.
    return resolved === node ? UNKNOWN : { ...this.value(resolved, parameters), assertion: false };
  }

  private callValue(node: estree.CallExpression, parameters: ParameterValues): SupertestValue {
    if (isSupertestCall(this.context, node)) {
      return { kind: 'agent', assertion: false };
    }
    const callee = unwrapTypeScriptExpression(node.callee);
    if (callee.type === 'MemberExpression') {
      return this.methodValue(callee, parameters);
    }
    if (callee.type !== 'Identifier' || node.arguments.some(arg => arg.type === 'SpreadElement')) {
      return UNKNOWN;
    }
    const helper = resolveLocalHelper(this.context, callee);
    return helper && !helper.async && !helper.generator
      ? this.helperValue(helper, node, parameters)
      : UNKNOWN;
  }

  private methodValue(
    callee: estree.MemberExpression,
    parameters: ParameterValues,
  ): SupertestValue {
    const method = callee.computed
      ? resolveSingleWriteExpression(this.context, callee.property)
      : callee.property;
    let name: string | undefined;
    if (!callee.computed && method.type === 'Identifier') {
      name = method.name;
    } else if (method.type === 'Literal' && typeof method.value === 'string') {
      name = method.value;
    }
    // A plugin can replace expect; an unknown computed method could be use().
    if (name === 'use') {
      return PLUGIN_REQUEST;
    }
    if (callee.optional || name === undefined) {
      return UNKNOWN;
    }
    const receiver = this.value(callee.object, parameters);
    if (receiver.plugin) {
      return receiver;
    }
    if (!receiver.kind || (name === 'expect' && receiver.kind !== 'test')) {
      return UNKNOWN;
    }
    return { kind: 'test', assertion: receiver.assertion || name === 'expect' };
  }

  private helperValue(
    helper: estree.Function,
    call: estree.CallExpression,
    outerParameters: ParameterValues,
  ): SupertestValue {
    const parameters = this.bindArguments(helper, call, outerParameters);
    const returned = getReturnedExpression(helper);
    if (returned) {
      return this.value(returned, parameters);
    }
    // An assertion helper can return void; its result must not become a request value.
    if (helper.body.type === 'BlockStatement' && helper.body.body.length === 1) {
      const [statement] = helper.body.body;
      if (statement.type === 'ExpressionStatement') {
        return { assertion: this.value(statement.expression, parameters).assertion };
      }
    }
    return UNKNOWN;
  }

  private bindArguments(
    helper: estree.Function,
    call: estree.CallExpression,
    outerParameters: ParameterValues,
  ): ParameterValues {
    const parameters = new Map(outerParameters);
    for (const [index, parameter] of helper.params.entries()) {
      const binding = parameter.type === 'AssignmentPattern' ? parameter.left : parameter;
      if (binding.type !== 'Identifier') {
        continue;
      }
      const variable = getVariableFromName(this.context, binding.name, binding);
      // Parameter reassignment invalidates its connection to the actual argument.
      if (
        !variable ||
        variable.references.some(reference => reference.isWrite() && !reference.init)
      ) {
        continue;
      }
      const input =
        call.arguments[index] ??
        (parameter.type === 'AssignmentPattern' ? parameter.right : undefined);
      parameters.set(variable, input ? this.value(input, outerParameters) : UNKNOWN);
    }
    return parameters;
  }
}

function isSupertestCall(context: Rule.RuleContext, returned: estree.CallExpression): boolean {
  const callee = unwrapTypeScriptExpression(returned.callee);
  const fqn = getFullyQualifiedName(context, callee) ?? getFullyQualifiedName(context, returned);
  if (fqn !== 'supertest' && fqn !== 'supertest.agent') {
    return false;
  }
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

/**
 * Resolve `http()` only when `http` names one local function definition.
 * Accept `function http() { ... }` with no writes to `http`.
 * Accept `const http = () => ...` or `let http = function () { ... }` with one initializer write.
 * Reject imported functions, aliases, and reassigned helpers.
 */
function resolveLocalHelper(
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
 * Accept an expression body or one return statement. More complex control flow needs type information.
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
