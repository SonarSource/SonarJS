/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S3513/javascript

import { Rule, Scope } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import estree from 'estree';
import * as meta from './meta.js';

const MESSAGE = "Use the rest syntax to declare this function's arguments.";
const SECONDARY_MESSAGE = 'Replace this reference to "arguments".';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    return {
      // Ignore root scope containing global variables
      'Program:exit': (node: estree.Node) =>
        context.sourceCode
          .getScope(node)
          .childScopes.forEach(child => checkArgumentsUsageInScopeRecursively(context, child)),
    };
  },
};

function checkArgumentsUsageInScopeRecursively(
  context: Rule.RuleContext,
  scope: Scope.Scope,
): void {
  scope.variables
    .filter(variable => variable.name === 'arguments')
    .forEach(variable => checkArgumentsVariableWithoutDefinition(context, variable));
  scope.childScopes.forEach(child => checkArgumentsUsageInScopeRecursively(context, child));
}

function checkArgumentsVariableWithoutDefinition(
  context: Rule.RuleContext,
  variable: Scope.Variable,
): void {
  // if variable is a parameter, variable.defs contains one ParameterDefinition with a type: 'Parameter'
  // if variable is a local variable, variable.defs contains one Definition with a type: 'Variable'
  // but if variable is the function arguments, variable.defs is just empty without other hint
  const isLocalVariableOrParameter = variable.defs.length > 0;
  const references = variable.references.filter(ref => !isFollowedByLengthProperty(ref));
  if (!isLocalVariableOrParameter && references.length > 0) {
    const firstReference = references[0];
    const secondaryLocations = references.slice(1).map(ref => ref.identifier) as TSESTree.Node[];
    report(
      context,
      {
        node: firstReference.identifier,
        message: MESSAGE,
      },
      secondaryLocations.map(node => toSecondaryLocation(node, SECONDARY_MESSAGE)),
    );
  }
}

function isFollowedByLengthProperty(reference: Scope.Reference): boolean {
  const parent = (reference.identifier as TSESTree.Node).parent;
  return (
    !!parent &&
    parent.type === 'MemberExpression' &&
    parent.property.type === 'Identifier' &&
    parent.property.name === 'length'
  );
}
