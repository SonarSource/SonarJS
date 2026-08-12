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
// https://sonarsource.github.io/rspec/#/rspec/S1481/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { getESLintCoreRule } from '../external/core.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

// @typescript-eslint/no-unused-vars crashes with "Cannot read properties of undefined
// (reading 'type')" on plain .js files that use Flow generics. Its `defToVariableType` switch
// has no `default` branch, so it returns `undefined` for any scope-manager definition type it
// doesn't know, and the caller immediately reads `.type` off that. @babel/eslint-parser — the
// parser used for .js files, never @typescript-eslint/parser — emits `def.type ===
// 'TypeParameter'` for Flow type parameters, which that switch does not handle. Any *unused*
// Flow type parameter triggers it, whatever form carries it (type alias, arrow, function or
// class declaration).
//
// ESLint core's own no-unused-vars makes no such assumption. S1481 is a JavaScript-only rule
// (see `languages` in generated-meta.ts), so the TypeScript-specific handling that the
// typescript-eslint variant adds on top of it is not needed here.
const baseRule = getESLintCoreRule('no-unused-vars');
// `Scope.Definition['type']` in @types/eslint predates Flow/TS definition kinds, so this value
// is not in the union.
const TYPE_PARAMETER_DEF = 'TypeParameter';
const defaultOptions = [
  {
    args: 'none',
    caughtErrors: 'none',
    vars: 'local',
  },
];
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    ...baseRule.meta,
    defaultOptions,
    fixable: undefined,
    hasSuggestions: undefined,
  }),
  create(context: Rule.RuleContext) {
    const jsxUsedVariables = new Set<Scope.Variable>();
    const baseListeners = interceptReport(baseRule, (reportContext, descriptor) => {
      const reportedVariable = getReportedVariable(reportContext.sourceCode, descriptor);
      if (
        isLegacyIgnoredRestSibling(descriptor) ||
        isExplicitGlobalDirectiveReport(descriptor) ||
        isTopLevelVariableFunctionOrClassReport(descriptor) ||
        isUnusedImportReport(reportedVariable) ||
        isTypeParameterReport(reportedVariable) ||
        isUsedInJsx(reportedVariable, jsxUsedVariables)
      ) {
        return;
      }
      const { fix: _fix, suggest: _suggest, ...rest } = descriptor;
      reportContext.report(rest);
    }).create(context);

    const baseJsxIdentifierListener = (
      baseListeners as Record<string, ((node: estree.Node) => void) | undefined>
    )['JSXIdentifier'];

    return {
      ...baseListeners,
      JSXIdentifier(node: estree.Node) {
        recordJsxUsage(context.sourceCode, node as TSESTree.JSXIdentifier, jsxUsedVariables);
        baseJsxIdentifierListener?.(node);
      },
    };
  },
};

type NodeWithParent = estree.Node & { parent?: NodeWithParent };
type EnclosingDeclaration =
  estree.VariableDeclarator | estree.FunctionDeclaration | estree.ClassDeclaration;

function isExplicitGlobalDirectiveReport(descriptor: Rule.ReportDescriptor) {
  return 'node' in descriptor && descriptor.node.type === 'Program';
}

function isUnusedImportReport(variable: Scope.Variable | null) {
  return variable?.defs.some(def => def.type === 'ImportBinding') ?? false;
}

/**
 * Flow type parameters (`type A<U> = ...`, `<U>(x) => x`) are not local variables or functions,
 * so they are out of scope for S1481. ESLint core's no-unused-vars has no notion of type
 * positions and would report them; the pre-existing SonarJS implementation never did.
 */
function isTypeParameterReport(variable: Scope.Variable | null) {
  return variable?.defs.some(def => (def.type as string) === TYPE_PARAMETER_DEF) ?? false;
}

function isUsedInJsx(variable: Scope.Variable | null, jsxUsedVariables: Set<Scope.Variable>) {
  return variable != null && jsxUsedVariables.has(variable);
}

function getReportedVariable(
  sourceCode: Rule.RuleContext['sourceCode'],
  descriptor: Rule.ReportDescriptor,
) {
  if (!('node' in descriptor) || descriptor.node.type !== 'Identifier') {
    return null;
  }

  return findDeclaredVariable(descriptor.node, sourceCode.getScope(descriptor.node));
}

function isTopLevelVariableFunctionOrClassReport(descriptor: Rule.ReportDescriptor) {
  if (!('node' in descriptor) || descriptor.node.type !== 'Identifier') {
    return false;
  }

  const declaration = getEnclosingDeclaration(descriptor.node);
  return declaration !== undefined && isTopLevelDeclaration(declaration);
}

function isLegacyIgnoredRestSibling(descriptor: Rule.ReportDescriptor) {
  if (!('node' in descriptor) || descriptor.node.type !== 'Identifier') {
    return false;
  }

  const property = getParent(descriptor.node);
  const objectPattern = property ? getParent(property) : undefined;
  if (
    property?.type !== 'Property' ||
    !property.shorthand ||
    property.value !== descriptor.node ||
    objectPattern?.type !== 'ObjectPattern'
  ) {
    return false;
  }

  return (
    objectPattern.properties.at(-1)?.type === 'RestElement' &&
    isInsideVariableDeclarationPattern(objectPattern)
  );
}

function isInsideVariableDeclarationPattern(node: NodeWithParent) {
  let current: NodeWithParent | undefined = node;

  while (current?.parent) {
    if (current.parent.type === 'VariableDeclarator') {
      return current.parent.id === current;
    }
    current = current.parent;
  }

  return false;
}

function getEnclosingDeclaration(node: NodeWithParent) {
  let current: NodeWithParent | undefined = node;

  while (current?.parent) {
    const parent: NodeWithParent = current.parent;
    if (isEnclosingDeclaration(parent)) {
      return parent.id === current ? parent : undefined;
    }
    current = parent;
  }

  return undefined;
}

function isEnclosingDeclaration(node: NodeWithParent): node is EnclosingDeclaration {
  return (
    node.type === 'VariableDeclarator' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'ClassDeclaration'
  );
}

function isTopLevelDeclaration(node: NodeWithParent) {
  if (node.type === 'VariableDeclarator') {
    const variableDeclaration = getParent(node);
    if (variableDeclaration?.type !== 'VariableDeclaration') {
      return false;
    }
    return isTopLevelStatement(variableDeclaration);
  }

  return isTopLevelStatement(node);
}

function isTopLevelStatement(node: NodeWithParent) {
  const parent = getParent(node);
  if (parent?.type === 'Program') {
    return true;
  }

  return (
    (parent?.type === 'ExportDefaultDeclaration' || parent?.type === 'ExportNamedDeclaration') &&
    getParent(parent)?.type === 'Program'
  );
}

function getParent(node: estree.Node) {
  return (node as NodeWithParent).parent;
}

function recordJsxUsage(
  sourceCode: Rule.RuleContext['sourceCode'],
  node: TSESTree.JSXIdentifier,
  jsxUsedVariables: Set<Scope.Variable>,
) {
  if (isJSXAttributeName(node)) {
    return;
  }

  const variable = findJSXVariableInScope(node, sourceCode.getScope(node));
  if (variable) {
    jsxUsedVariables.add(variable);
  }
}

function findDeclaredVariable(
  node: estree.Identifier,
  scope: Scope.Scope | null,
): Scope.Variable | null {
  if (scope == null) {
    return null;
  }

  return (
    scope.variables.find(variable => variable.identifiers.includes(node)) ??
    findDeclaredVariable(node, scope.upper)
  );
}

function findJSXVariableInScope(
  node: TSESTree.JSXIdentifier,
  scope: Scope.Scope | null,
): Scope.Variable | null {
  return (
    scope &&
    (scope.variables.find(variable => variable.name === node.name) ??
      findJSXVariableInScope(node, scope.upper))
  );
}

function isJSXAttributeName(node: TSESTree.JSXIdentifier) {
  const parent = node.parent;
  return parent?.type === 'JSXAttribute' && parent.name === node;
}
