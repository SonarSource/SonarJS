/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import type { TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import { eslintRules } from '../core';
import { decorate } from './decorator';

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

const eslintNoUselessConstructor = eslintRules['no-useless-constructor'];

const originalRule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: eslintNoUselessConstructor.meta!.messages,
  },

  create(context) {
    const rules = eslintNoUselessConstructor.create(context);
    return {
      MethodDefinition(node): void {
        if (
          node.value.type === 'FunctionExpression' &&
          node.kind === 'constructor' &&
          checkAccessibility(node as TSESTree.MethodDefinition) &&
          checkParams(node as TSESTree.MethodDefinition)
        ) {
          rules.MethodDefinition!(node);
        }
      },
    };
  },
};

export const rule = decorate(originalRule);
