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
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import {
  FUNCTION_NODES,
  getUniqueWriteReference,
  getVariableFromScope,
  isIdentifier,
  isStaticTemplateLiteral,
  isStringLiteral,
} from './ast.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from './module.js';

export const SUPPORTED_TEST_FRAMEWORKS = [
  'bun:test',
  'jest',
  'mocha',
  'node:test',
  'vitest',
  '@playwright/test',
];
const MOCHA_STYLE_TEST_FRAMEWORKS = new Set(['bun:test', 'jest', 'mocha', 'test', 'vitest']);
export const TEST_FUNCTION_NAMES = ['it', 'specify', 'test'];
export const SUITE_FUNCTION_NAMES = ['describe', 'context', 'suite'];
const COMMON_MOCHA_TEST_MODIFIERS = new Set(['only', 'concurrent']);
const JEST_TEST_MODIFIERS = new Set(['failing']);
const VITEST_TEST_MODIFIERS = new Set(['sequential']);
const PLAYWRIGHT_TEST_FQN = '@playwright.test.test';
export const PLAYWRIGHT_TEST_MODIFIERS = new Set(['only', 'fail']);
export const PLAYWRIGHT_DESCRIBE_MODIFIERS = new Set(['parallel', 'serial']);
export const PLAYWRIGHT_DESCRIBE_FOCUS_MODIFIER = 'only';

type ParameterizedTestFramework = 'bun' | 'jest' | 'vitest';

const PARAMETERIZED_TEST_JEST_IMPORTS = ['jest', '@jest/globals'];
const PARAMETERIZED_TEST_JEST_DEPENDENCIES = ['jest'];
const PARAMETERIZED_TEST_VITEST_MODULES = ['vitest'];
const PARAMETERIZED_TEST_BUN_MODULES = ['bun:test'];
const PARAMETERIZED_TEST_BUN_FQN_PREFIX = 'bun:test.';
const PARAMETERIZED_TEST_JEST_GLOBALS_FQN_PREFIX = '@jest.globals.';
const PARAMETERIZED_TEST_COMMON_MODIFIERS = new Set(['only', 'concurrent']);
const PARAMETERIZED_TEST_JEST_MODIFIERS = new Set(['failing']);
const PARAMETERIZED_TEST_VITEST_MODIFIERS = new Set(['fails', 'sequential']);
const PARAMETERIZED_TEST_NAMES = new Set(['test', 'it']);
const PARAMETERIZED_SUITE_NAMES = new Set(['describe', 'suite']);
const PARAMETERIZED_BUN_CONSTRUCTS = new Set(['test', 'describe']);

export function getParameterizedTestFrameworks(
  context: Rule.RuleContext,
): Record<ParameterizedTestFramework, boolean> {
  return {
    bun: importsOrDependsOnModule(
      context,
      PARAMETERIZED_TEST_BUN_MODULES,
      PARAMETERIZED_TEST_BUN_MODULES,
    ),
    jest: importsOrDependsOnModule(
      context,
      PARAMETERIZED_TEST_JEST_IMPORTS,
      PARAMETERIZED_TEST_JEST_DEPENDENCIES,
    ),
    vitest: importsOrDependsOnModule(
      context,
      PARAMETERIZED_TEST_VITEST_MODULES,
      PARAMETERIZED_TEST_VITEST_MODULES,
    ),
  };
}

export function hasSupportedParameterizedCallback(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): boolean {
  if (hasCallback(node)) {
    return true;
  }

  const callback = node.arguments[1];
  if (callback?.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromScope(context.sourceCode.getScope(callback), callback.name);
  if (variable?.defs.length !== 1) {
    return false;
  }

  const [definition] = variable.defs;
  if (definition.type === 'FunctionName') {
    return !variable.references.some(reference => reference.isWrite());
  }
  if (definition.type !== 'Variable') {
    return false;
  }

  const initializer = definition.node.init;
  return (
    initializer != null &&
    FUNCTION_NODES.includes(initializer.type) &&
    getUniqueWriteReference(variable) === initializer
  );
}

export function isSupportedParameterizedDeclaration(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  activeFrameworks: Record<ParameterizedTestFramework, boolean>,
): boolean {
  const parts = getMochaCalleeParts(node.callee);
  if (parts?.modifiers.at(-1) !== 'each') {
    return false;
  }

  const name = getParameterizedConstructName(context, parts.base);
  if (
    name === undefined ||
    (!PARAMETERIZED_TEST_NAMES.has(name) && !PARAMETERIZED_SUITE_NAMES.has(name))
  ) {
    return false;
  }

  const framework = getParameterizedFramework(context, parts.base, activeFrameworks);
  if (
    framework === undefined ||
    (name === 'suite' && framework !== 'vitest') ||
    (framework === 'bun' && !PARAMETERIZED_BUN_CONSTRUCTS.has(name))
  ) {
    return false;
  }

  const modifiers = parts.modifiers.slice(0, -1);
  return modifiers.every(modifier => isSupportedParameterizedModifier(modifier, name, framework));
}

function getParameterizedConstructName(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): string | undefined {
  const fqn = getFullyQualifiedName(context, identifier);
  if (fqn?.startsWith(PARAMETERIZED_TEST_BUN_FQN_PREFIX)) {
    return fqn.slice(PARAMETERIZED_TEST_BUN_FQN_PREFIX.length);
  }
  if (fqn?.startsWith(PARAMETERIZED_TEST_JEST_GLOBALS_FQN_PREFIX)) {
    return fqn.slice(PARAMETERIZED_TEST_JEST_GLOBALS_FQN_PREFIX.length);
  }
  if (fqn?.startsWith('jest.')) {
    return fqn.slice('jest.'.length);
  }
  if (fqn?.startsWith('vitest.')) {
    return fqn.slice('vitest.'.length);
  }

  const variable = getVariableFromScope(context.sourceCode.getScope(identifier), identifier.name);
  return variable == null || variable.defs.length === 0 ? identifier.name : undefined;
}

function getParameterizedFramework(
  context: Rule.RuleContext,
  base: estree.Identifier,
  activeFrameworks: Record<ParameterizedTestFramework, boolean>,
): ParameterizedTestFramework | undefined {
  const fqn = getFullyQualifiedName(context, base);
  if (fqn?.startsWith(PARAMETERIZED_TEST_BUN_FQN_PREFIX)) {
    return 'bun';
  }
  if (fqn?.startsWith('vitest.')) {
    return 'vitest';
  }
  if (fqn?.startsWith('jest.') || fqn?.startsWith(PARAMETERIZED_TEST_JEST_GLOBALS_FQN_PREFIX)) {
    return 'jest';
  }
  if (base.name === 'suite') {
    return activeFrameworks.vitest ? 'vitest' : undefined;
  }

  const active = (
    Object.entries(activeFrameworks) as [ParameterizedTestFramework, boolean][]
  ).filter(([, isActive]) => isActive);
  return active.length === 1 ? active[0][0] : undefined;
}

function isSupportedParameterizedModifier(
  modifier: string,
  name: string,
  framework: ParameterizedTestFramework,
): boolean {
  if (PARAMETERIZED_TEST_COMMON_MODIFIERS.has(modifier)) {
    return framework !== 'bun' || modifier === 'only';
  }
  if (!PARAMETERIZED_TEST_NAMES.has(name)) {
    return framework === 'vitest' && modifier === 'sequential';
  }
  return (
    (framework === 'jest' && PARAMETERIZED_TEST_JEST_MODIFIERS.has(modifier)) ||
    (framework === 'vitest' && PARAMETERIZED_TEST_VITEST_MODIFIERS.has(modifier))
  );
}

export function isMochaTestConstruct(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  constructs: string[],
  // The parameterized `each` form (`describe.each(table)(name, fn)`) is opt-in: it
  // is an executing test/suite, but some rules deliberately exclude parameterized
  // titles (e.g. S8781 `no-empty-test-title`), so it is off by default.
  { allowParameterized = false }: { allowParameterized?: boolean } = {},
): boolean {
  const calleeParts = getMochaCalleeParts(node.callee);
  if (calleeParts === undefined) {
    return false;
  }

  const { constructName, modifiers } = getMochaConstructAndModifiers(context, calleeParts);
  if (constructName === undefined || !constructs.includes(constructName)) {
    return false;
  }

  return modifiers.every(
    modifier =>
      (allowParameterized && modifier === 'each') || isConcreteMochaTestModifier(context, modifier),
  );
}

export function isConcreteMochaTestModifier(context: Rule.RuleContext, modifier: string): boolean {
  return (
    COMMON_MOCHA_TEST_MODIFIERS.has(modifier) ||
    (JEST_TEST_MODIFIERS.has(modifier) && isTestFrameworkActive(context, 'jest')) ||
    (VITEST_TEST_MODIFIERS.has(modifier) && isTestFrameworkActive(context, 'vitest'))
  );
}

function isTestFrameworkActive(context: Rule.RuleContext, framework: string): boolean {
  return importsOrDependsOnModule(context, [framework], [framework]);
}

export function getMochaCalleeParts(
  node: estree.Node,
): { base: estree.Identifier; modifiers: string[] } | undefined {
  const modifiers: string[] = [];
  let current = node;
  // Tracks whether the node we just descended from was a call application, so the
  // curried `each` form (`X.each(table)(...)`) can be told apart from the bare
  // factory (`X.each` / `X.each(table)`), which is not itself a test/suite.
  let appliedAsCall = false;
  while (true) {
    if (current.type === 'CallExpression') {
      current = current.callee;
      appliedAsCall = true;
    } else if (isQualifyingMember(current)) {
      if (current.property.name === 'each' && !appliedAsCall) {
        return undefined;
      }
      modifiers.unshift(current.property.name);
      current = current.object;
      appliedAsCall = false;
    } else {
      break;
    }
  }
  return current.type === 'Identifier' ? { base: current, modifiers } : undefined;
}

export function collectMemberChain(node: estree.Node): {
  base: estree.Node;
  qualifiers: string[];
} {
  const qualifiers: string[] = [];
  let current = node;
  while (isQualifyingMember(current)) {
    qualifiers.unshift(current.property.name);
    current = current.object;
  }
  return { base: current, qualifiers };
}

function isQualifyingMember(
  node: estree.Node,
): node is estree.MemberExpression & { property: estree.Identifier } {
  return node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property);
}

function getMochaBaseConstructName(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): string | undefined {
  const variable = getVariableFromScope(context.sourceCode.getScope(identifier), identifier.name);
  const definition = variable?.defs.find(
    def => def.type === 'ImportBinding' || isSupportedRequireBinding(def.node),
  );
  if (definition !== undefined) {
    const fqn = getFullyQualifiedName(context, identifier);
    return (
      getMochaConstructNameFromFqn(fqn) ??
      (fqn === 'test' && isNodeTestDefaultBindingDefinition(definition) ? 'test' : undefined)
    );
  }

  return variable == null || variable.defs.length === 0 ? identifier.name : undefined;
}

export function getMochaConstructAndModifiers(
  context: Rule.RuleContext,
  calleeParts: { base: estree.Identifier; modifiers: string[] },
): { constructName: string | undefined; modifiers: string[] } {
  const constructName = getMochaBaseConstructName(context, calleeParts.base);
  if (
    constructName === 'test' &&
    isNodeTestDefaultBinding(context, calleeParts.base) &&
    calleeParts.modifiers.length > 0
  ) {
    const [nodeTestConstructName, ...modifiers] = calleeParts.modifiers;
    if (
      TEST_FUNCTION_NAMES.includes(nodeTestConstructName) ||
      SUITE_FUNCTION_NAMES.includes(nodeTestConstructName)
    ) {
      return { constructName: nodeTestConstructName, modifiers };
    }
  }
  return { constructName, modifiers: calleeParts.modifiers };
}

function isNodeTestDefaultBinding(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): boolean {
  const variable = getVariableFromScope(context.sourceCode.getScope(identifier), identifier.name);
  const definition = variable?.defs.find(
    def => def.type === 'ImportBinding' || isSupportedRequireBinding(def.node),
  );
  return definition !== undefined && isNodeTestDefaultBindingDefinition(definition);
}

function isNodeTestDefaultBindingDefinition(definition: Scope.Definition): boolean {
  if (definition.type === 'ImportBinding') {
    return (
      definition.node.type === 'ImportDefaultSpecifier' &&
      definition.parent.type === 'ImportDeclaration' &&
      definition.parent.source.value === 'node:test'
    );
  }

  if (definition.type !== 'Variable' || definition.node.type !== 'VariableDeclarator') {
    return false;
  }

  const requireCall = definition.node.init && getRequireCall(definition.node.init);
  const moduleName = requireCall?.arguments[0];
  return (
    definition.node.id.type === 'Identifier' &&
    moduleName?.type === 'Literal' &&
    moduleName.value === 'node:test'
  );
}

function getMochaConstructNameFromFqn(fqn: string | null): string | undefined {
  const parts = fqn?.split('.');
  if (parts?.length !== 2) {
    return undefined;
  }

  const [framework, constructName] = parts;
  return MOCHA_STYLE_TEST_FRAMEWORKS.has(framework) ? constructName : undefined;
}

function isSupportedRequireBinding(node: estree.Node): boolean {
  if (node.type !== 'VariableDeclarator' || node.init == null) {
    return false;
  }

  const requireCall = getRequireCall(node.init);
  const moduleName = requireCall?.arguments[0];
  return (
    moduleName?.type === 'Literal' &&
    typeof moduleName.value === 'string' &&
    SUPPORTED_TEST_FRAMEWORKS.includes(moduleName.value)
  );
}

function getRequireCall(node: estree.Node): estree.CallExpression | undefined {
  if (isRequireCall(node)) {
    return node;
  }

  if (node.type === 'MemberExpression') {
    return getRequireCall(node.object);
  }

  return undefined;
}

function isRequireCall(node: estree.Node): node is estree.CallExpression {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require'
  );
}

export function hasCallback(node: estree.CallExpression): boolean {
  return node.arguments.some(argument => FUNCTION_NODES.includes(argument.type));
}

export function getStaticTitle(node: estree.Node): string | undefined {
  if (isStringLiteral(node)) {
    return node.value;
  }
  if (isStaticTemplateLiteral(node)) {
    const value = node.quasis[0].value;
    return value.cooked ?? value.raw;
  }
  return undefined;
}

export function getPlaywrightTestQualifiers(
  context: Rule.RuleContext,
  node: estree.Node,
): string[] | undefined {
  const { base, qualifiers } = collectMemberChain(node);
  return getFullyQualifiedName(context, base) === PLAYWRIGHT_TEST_FQN ? qualifiers : undefined;
}

export function getPlaywrightDescribeQualifiers(node: estree.Node): string[] | undefined {
  const { base, qualifiers } = collectMemberChain(node);
  return isIdentifier(base, 'test') ? qualifiers : undefined;
}
