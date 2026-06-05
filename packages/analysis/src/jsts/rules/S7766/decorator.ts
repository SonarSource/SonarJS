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
// https://sonarsource.github.io/rspec/#/rspec/S7766/javascript

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { getVariableFromScope, hasParent, isThisExpression } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import * as meta from './generated-meta.js';

const comparisonOperators = new Set(['<', '<=', '>', '>=']);

type MinMaxConditionalExpression = estree.ConditionalExpression & {
  test: estree.BinaryExpression;
};

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (!isMinMaxConditionalReport(descriptor, context.sourceCode)) {
        context.report(descriptor);
        return;
      }

      if (shouldSuppressReport(descriptor.node, context.sourceCode)) {
        return;
      }

      context.report(descriptor);
    },
  );
}

function shouldSuppressReport(node: MinMaxConditionalExpression, sourceCode: SourceCode): boolean {
  return (
    !isRequiredParserServices(sourceCode.parserServices) &&
    hasDirectObjectSelectionEvidence(node, sourceCode)
  );
}

function isMinMaxConditionalReport(
  descriptor: Rule.ReportDescriptor,
  sourceCode: SourceCode,
): descriptor is Rule.ReportDescriptor & { node: MinMaxConditionalExpression } {
  if (!('node' in descriptor) || descriptor.node.type !== 'ConditionalExpression') {
    return false;
  }

  const { test, consequent, alternate } = descriptor.node;
  return (
    test.type === 'BinaryExpression' &&
    comparisonOperators.has(test.operator) &&
    ((areEquivalent(test.left, consequent, sourceCode) &&
      areEquivalent(test.right, alternate, sourceCode)) ||
      (areEquivalent(test.left, alternate, sourceCode) &&
        areEquivalent(test.right, consequent, sourceCode)))
  );
}

function hasDirectObjectSelectionEvidence(
  node: MinMaxConditionalExpression,
  sourceCode: SourceCode,
): boolean {
  const { left, right } = node.test;
  return (
    hasDirectObjectEvidence(left, sourceCode, new Set()) ||
    hasDirectObjectEvidence(right, sourceCode, new Set())
  );
}

function hasDirectObjectEvidence(
  node: estree.Node,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  if (isThisExpression(node) || isDirectObjectExpression(node)) {
    return true;
  }

  if (node.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromScope(sourceCode.getScope(node), node.name);
  if (!variable || visitedVariables.has(variable)) {
    return false;
  }
  visitedVariables.add(variable);

  return variable.defs.some(definition =>
    hasDirectObjectDefinition(definition, sourceCode, visitedVariables),
  );
}

function hasDirectObjectDefinition(
  definition: Scope.Definition,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  switch (definition.type) {
    case 'Parameter':
      return hasDirectObjectCallSites(definition, sourceCode);
    case 'Variable':
      return (
        definition.node.init != null &&
        hasDirectObjectEvidence(definition.node.init, sourceCode, visitedVariables)
      );
    default:
      return false;
  }
}

function hasDirectObjectCallSites(definition: Scope.Definition, sourceCode: SourceCode): boolean {
  if (definition.name.type !== 'Identifier' || !isFunctionNode(definition.node)) {
    return false;
  }

  const parameterIndex = definition.node.params.indexOf(definition.name);
  if (parameterIndex === -1) {
    return false;
  }

  const callSites = findDirectCallSites(definition.node, sourceCode);
  return (
    callSites !== null &&
    callSites.length > 0 &&
    callSites.every(callSite => isDirectObjectArgument(callSite.arguments[parameterIndex]))
  );
}

function findDirectCallSites(
  functionNode: estree.Function,
  sourceCode: SourceCode,
): estree.CallExpression[] | null {
  const variable = getFunctionVariable(functionNode, sourceCode);
  if (!variable) {
    return null;
  }

  const calls: estree.CallExpression[] = [];
  for (const reference of variable.references) {
    const parent = hasParent(reference.identifier) ? reference.identifier.parent : null;
    if (parent?.type === 'CallExpression' && parent.callee === reference.identifier) {
      calls.push(parent);
      continue;
    }
    return null;
  }

  return calls;
}

function getFunctionVariable(
  functionNode: estree.Function,
  sourceCode: SourceCode,
): Scope.Variable | undefined {
  if (functionNode.type === 'FunctionDeclaration' && functionNode.id) {
    return getVariableFromScope(sourceCode.getScope(functionNode.id), functionNode.id.name);
  }

  if (!hasParent(functionNode)) {
    return undefined;
  }

  const parent = functionNode.parent;
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return getVariableFromScope(sourceCode.getScope(parent.id), parent.id.name);
  }

  if (parent?.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    return getVariableFromScope(sourceCode.getScope(parent.left), parent.left.name);
  }

  return undefined;
}

function isDirectObjectArgument(
  argument: estree.Expression | estree.SpreadElement | undefined,
): boolean {
  return (
    argument != null && argument.type !== 'SpreadElement' && isDirectObjectExpression(argument)
  );
}

function isDirectObjectExpression(node: estree.Node): boolean {
  return isDateConstruction(node) || isObjectLiteralWithValueOf(node);
}

function isDateConstruction(node: estree.Node): node is estree.NewExpression {
  return (
    node.type === 'NewExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'Date'
  );
}

function isObjectLiteralWithValueOf(node: estree.Node): node is estree.ObjectExpression {
  return (
    node.type === 'ObjectExpression' &&
    node.properties.some(
      property =>
        property.type === 'Property' &&
        !property.computed &&
        ((property.key.type === 'Identifier' && property.key.name === 'valueOf') ||
          (property.key.type === 'Literal' && property.key.value === 'valueOf')),
    )
  );
}

function isFunctionNode(node: estree.Node): node is estree.Function {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}
