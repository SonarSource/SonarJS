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
// https://sonarsource.github.io/rspec/#/rspec/S5725/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Variable } from 'eslint-scope';
import { isIdentifier, isRequiredParserServices, getTypeAsString } from '../helpers';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      safeResource: 'Make sure not using resource integrity feature is safe here.',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    function shouldReport(assignedVariable: Variable) {
      let nbSrcAssignment = 0;
      let hasUnsafeSrcAssignment = false;
      let hasIntegrityAssignment = false;
      assignedVariable.references.forEach(ref => {
        const parentNode = (ref.identifier as TSESTree.Node).parent;
        if (!parentNode) {
          return;
        }
        nbSrcAssignment += isSrcAssignment(parentNode) ? 1 : 0;
        hasUnsafeSrcAssignment = hasUnsafeSrcAssignment || isUnsafeSrcAssignment(parentNode);
        hasIntegrityAssignment = hasIntegrityAssignment || isIntegrityAssignment(parentNode);
      });
      return nbSrcAssignment === 1 && hasUnsafeSrcAssignment && !hasIntegrityAssignment;
    }

    function isIntegrityAssignment(memberExpression: TSESTree.Node): boolean {
      if (memberExpression.type !== 'MemberExpression') {
        return false;
      }
      return (
        memberExpression.property.type === 'Identifier' &&
        memberExpression.property.name === 'integrity'
      );
    }

    function isSrcAssignment(memberExpression: TSESTree.Node): boolean {
      if (memberExpression.type !== 'MemberExpression') {
        return false;
      }
      if (
        memberExpression.property.type !== 'Identifier' ||
        memberExpression.property.name !== 'src'
      ) {
        return false;
      }
      const assignmentExpression = memberExpression.parent;
      if (assignmentExpression?.type !== 'AssignmentExpression') {
        return false;
      }
      return true;
    }

    function isUnsafeSrcAssignment(memberExpression: TSESTree.Node): boolean {
      if (!isSrcAssignment(memberExpression)) {
        return false;
      }
      const right = (memberExpression.parent as estree.AssignmentExpression).right;
      if (right.type !== 'Literal') {
        return false;
      }
      return !!right.raw && (!!right.raw.match('^"http') || !!right.raw.match('^"//'));
    }

    return {
      'VariableDeclarator[init.type="CallExpression"]': (node: estree.Node) => {
        const variableDeclarator = node as estree.VariableDeclarator;
        const callExpression = variableDeclarator.init as estree.CallExpression;
        const left = variableDeclarator.id;
        const { callee } = callExpression;
        if (left.type !== 'Identifier') {
          return;
        }
        if (callee.type !== 'MemberExpression') {
          return;
        }
        const typeName = getTypeAsString(left, services);
        if (
          !isIdentifier(callee.object, 'document') ||
          !isIdentifier(callee.property, 'createElement') ||
          typeName !== 'HTMLScriptElement'
        ) {
          return;
        }
        const scope = context.getScope();
        const assignedVariable = scope.variables.find(v => v.name === left.name);
        if (!assignedVariable) {
          return;
        }
        if (shouldReport(assignedVariable)) {
          context.report({
            node: variableDeclarator,
            messageId: 'safeResource',
          });
        }
      },
    };
  },
};
