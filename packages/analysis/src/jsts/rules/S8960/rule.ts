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
// https://sonarsource.github.io/rspec/#/rspec/S8960/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { getVariableFromScope, isIdentifier } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import { getMochaCalleeParts } from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const messages = {
  singleTestCompletionStyle:
    'Use a single completion style for this test callback: remove the completion callback or stop declaring the callback `async`.',
  singleHookCompletionStyle:
    'Use a single completion style for this hook callback: remove the completion callback or stop declaring the callback `async`.',
} as const;

const JEST_IMPORTS = ['jest', '@jest/globals'];
const JEST_DEPENDENCIES = ['jest'];
const MOCHA_MODULES = ['mocha'];
const JASMINE_MODULES = ['jasmine', 'jasmine-core', 'jasmine-node', 'karma-jasmine'];
const UNSUPPORTED_GLOBAL_FRAMEWORK_IMPORTS = ['vitest', '@playwright/test', 'cypress', 'node:test'];
const UNSUPPORTED_GLOBAL_FRAMEWORK_DEPENDENCIES = ['vitest', '@playwright/test', 'cypress'];

const TEST_FUNCTION_NAMES = new Set(['it', 'test', 'specify']);
const HOOK_FUNCTION_NAMES = new Set([
  'before',
  'after',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
]);
const SUPPORTED_CONSTRUCT_NAMES = new Set([...TEST_FUNCTION_NAMES, ...HOOK_FUNCTION_NAMES]);
const SUPPORTED_MODULE_FQNS = ['jest', '@jest.globals', 'mocha', 'jasmine'];
const COMMON_TEST_MODIFIERS = new Set(['only']);
const JEST_TEST_MODIFIERS = new Set(['concurrent', 'failing']);

type FunctionNode = estree.FunctionExpression | estree.ArrowFunctionExpression;
type ConstructKind = 'test' | 'hook';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const activeFrameworks = {
      jest: importsOrDependsOnModule(context, JEST_IMPORTS, JEST_DEPENDENCIES),
      mocha: importsOrDependsOnModule(context, MOCHA_MODULES, MOCHA_MODULES),
      jasmine: importsOrDependsOnModule(context, JASMINE_MODULES, JASMINE_MODULES),
    };

    if (!Object.values(activeFrameworks).some(Boolean)) {
      return {};
    }

    const allowGlobalConstructs = !importsOrDependsOnModule(
      context,
      UNSUPPORTED_GLOBAL_FRAMEWORK_IMPORTS,
      UNSUPPORTED_GLOBAL_FRAMEWORK_DEPENDENCIES,
    );

    return {
      CallExpression(node: estree.CallExpression) {
        const callback = getCallback(node);
        if (!callback?.async) {
          return;
        }

        const completionCallback = getCompletionCallbackParameter(callback);
        if (completionCallback === undefined) {
          return;
        }

        const constructKind = getConstructKind(
          context,
          node,
          activeFrameworks.jest,
          allowGlobalConstructs,
        );
        if (constructKind === undefined) {
          return;
        }

        const asyncToken = context.sourceCode.getFirstToken(callback);
        if (asyncToken?.value !== 'async') {
          return;
        }

        const messageId =
          constructKind === 'hook' ? 'singleHookCompletionStyle' : 'singleTestCompletionStyle';

        report(
          context,
          {
            loc: asyncToken.loc,
            messageId,
            message: messages[messageId],
          },
          [toSecondaryLocation(completionCallback, 'Completion callback parameter.')],
        );
      },
    };
  },
};

function getCallback(node: estree.CallExpression): FunctionNode | undefined {
  const callback = node.arguments.find(
    argument =>
      argument.type === 'FunctionExpression' || argument.type === 'ArrowFunctionExpression',
  );
  return callback?.type === 'FunctionExpression' || callback?.type === 'ArrowFunctionExpression'
    ? callback
    : undefined;
}

function getCompletionCallbackParameter(callback: FunctionNode): estree.Identifier | undefined {
  const [firstParameter] = callback.params;
  return isIdentifier(firstParameter) ? firstParameter : undefined;
}

function getConstructKind(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  jestActive: boolean,
  allowGlobalConstructs: boolean,
): ConstructKind | undefined {
  const calleeParts = getMochaCalleeParts(node.callee);
  if (calleeParts === undefined) {
    return undefined;
  }

  const construct = getSupportedConstruct(
    context,
    calleeParts.base,
    calleeParts.modifiers,
    allowGlobalConstructs,
  );
  if (construct === undefined) {
    return undefined;
  }

  if (HOOK_FUNCTION_NAMES.has(construct.name)) {
    return construct.modifiers.length === 0 ? 'hook' : undefined;
  }

  return construct.modifiers.every(modifier => isConcreteTestModifier(modifier, jestActive))
    ? 'test'
    : undefined;
}

function getSupportedConstruct(
  context: Rule.RuleContext,
  base: estree.Identifier,
  modifiers: string[],
  allowGlobalConstructs: boolean,
): { name: string; modifiers: string[] } | undefined {
  const fqn = getFullyQualifiedName(context, base);
  const importedName = getConstructNameFromFullyQualifiedName(fqn);
  if (importedName !== undefined) {
    return { name: importedName, modifiers };
  }

  if (
    modifiers.length > 0 &&
    SUPPORTED_CONSTRUCT_NAMES.has(modifiers[0]) &&
    isSupportedModule(fqn)
  ) {
    return { name: modifiers[0], modifiers: modifiers.slice(1) };
  }

  const variable = getVariableFromScope(context.sourceCode.getScope(base), base.name);
  if (
    allowGlobalConstructs &&
    (variable === undefined || variable.defs.length === 0) &&
    SUPPORTED_CONSTRUCT_NAMES.has(base.name)
  ) {
    return { name: base.name, modifiers };
  }

  return undefined;
}

function getConstructNameFromFullyQualifiedName(fqn: string | null): string | undefined {
  if (fqn === null) {
    return undefined;
  }

  const moduleName = SUPPORTED_MODULE_FQNS.find(candidate => fqn.startsWith(`${candidate}.`));
  const constructName = moduleName === undefined ? undefined : fqn.slice(moduleName.length + 1);
  return constructName !== undefined && SUPPORTED_CONSTRUCT_NAMES.has(constructName)
    ? constructName
    : undefined;
}

function isSupportedModule(fqn: string | null): boolean {
  return fqn !== null && SUPPORTED_MODULE_FQNS.includes(fqn);
}

function isConcreteTestModifier(modifier: string, jestActive: boolean): boolean {
  return COMMON_TEST_MODIFIERS.has(modifier) || (jestActive && JEST_TEST_MODIFIERS.has(modifier));
}
