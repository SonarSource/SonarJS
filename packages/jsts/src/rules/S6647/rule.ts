/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { getESLintCoreRule } from '../external/core.js';
import { decorate } from './decorator.js';
import { getVariableFromName } from '../helpers/index.js';
import type estree from 'estree';

/**
 * Check if method with accessibility is not useless
 */
function checkAccessibility(node: TSESTree.MethodDefinition): boolean {
  switch (node.accessibility) {
    case 'protected':
    case 'private':
      return false;
    case 'public':
      if (
        node.parent.type === 'ClassBody' &&
        'superClass' in node.parent.parent &&
        node.parent.parent.superClass
      ) {
        return false;
      }
      break;
  }
  return true;
}

/**
 * Check if method is not useless due to typescript parameter properties and decorators
 */
function checkParams(node: TSESTree.MethodDefinition): boolean {
  return !node.value.params.some(
    param => param.type === 'TSParameterProperty' || param.decorators?.length > 0,
  );
}

/**
 * Check if the enclosing class is not decorated.
 */
function checkDecorator(node: TSESTree.MethodDefinition): boolean {
  return !(
    node.parent.parent?.type === 'ClassDeclaration' && node.parent.parent.decorators?.length > 0
  );
}

/**
 * Check if the enclosing class does not inherit a protected constructor.
 */
function checkInheritance(node: TSESTree.MethodDefinition, context: Rule.RuleContext): boolean {
  if (
    node.parent.type === 'ClassBody' &&
    'superClass' in node.parent.parent &&
    node.parent.parent.superClass
  ) {
    const superClass = node.parent.parent.superClass as TSESTree.Identifier;
    const variable = getVariableFromName(context, superClass.name, node as estree.Node);
    for (const def of variable?.defs ?? []) {
      if (def.type === 'ImportBinding') {
        return false;
      }
      if (def.node.type === 'ClassDeclaration') {
        const decl = def.node as TSESTree.ClassDeclaration;
        if (
          decl.body.body.some(
            member =>
              member.type === 'MethodDefinition' &&
              member.kind === 'constructor' &&
              member.accessibility === 'protected',
          )
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

const eslintNoUselessConstructor = getESLintCoreRule('no-useless-constructor');

const originalRule: Rule.RuleModule = {
  meta: eslintNoUselessConstructor.meta,

  create(context) {
    const rules = eslintNoUselessConstructor.create(context);
    return {
      MethodDefinition(node): void {
        if (
          node.value.type === 'FunctionExpression' &&
          node.kind === 'constructor' &&
          checkAccessibility(node as TSESTree.MethodDefinition) &&
          checkParams(node as TSESTree.MethodDefinition) &&
          checkDecorator(node as TSESTree.MethodDefinition) &&
          checkInheritance(node as TSESTree.MethodDefinition, context)
        ) {
          rules.MethodDefinition!(node);
        }
      },
    };
  },
};

export const rule = decorate(originalRule);
