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
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const baseRule = tsEslintRules['no-unused-vars'];
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
    const parent = current.parent;
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
