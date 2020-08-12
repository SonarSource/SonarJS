/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-4502

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  isIdentifier,
  getModuleNameOfImportedIdentifier,
  getModuleNameOfIdentifier,
  toEncodedMessage,
  getUniqueWriteUsage,
  getModuleNameFromRequire,
  getObjectExpressionProperty,
} from './utils';
import { isLiteral } from 'eslint-plugin-sonarjs/lib/utils/nodes';

const CSURF_MODULE = 'csurf';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    let globalCsrfProtection = false;
    let usesCsrfMiddleware = false;

    function checkIgnoredMethods(node: estree.Property) {
      if (node.value.type === 'ArrayExpression') {
        const arrayExpr = node.value;
        const unsafeMethods = arrayExpr.elements.filter(
          e => isLiteral(e) && typeof e.value === 'string' && !SAFE_METHODS.includes(e.value),
        );
        if (unsafeMethods.length > 0) {
          const [first, ...rest] = unsafeMethods;
          context.report({
            message: toEncodedMessage('Make sure disabling CSRF protection is safe here.', rest),
            node: first,
          });
        }
      }
    }

    function isCsurfMiddleware(node: estree.Node | undefined) {
      if (node?.type === 'Identifier') {
        node = getUniqueWriteUsage(context, node.name);
      }

      if (node && node.type === 'CallExpression' && node.callee.type === 'Identifier') {
        const module = getModuleNameOfIdentifier(node.callee, context);
        return module && module.value === 'csurf';
      }
      return false;
    }

    function checkCallExpression(callExpression: estree.CallExpression) {
      const { callee } = callExpression;

      const requiredModule = getModuleNameFromRequire(callExpression);
      if (requiredModule?.value === CSURF_MODULE) {
        usesCsrfMiddleware = true;
      }

      if (callee.type === 'Identifier') {
        const moduleName =
          getModuleNameOfImportedIdentifier(callee, context) ||
          getModuleNameOfIdentifier(callee, context);

        if (moduleName?.value === CSURF_MODULE) {
          const [arg] = callExpression.arguments;
          const ignoredMethods = getObjectExpressionProperty(arg, 'ignoreMethods');
          if (ignoredMethods) {
            checkIgnoredMethods(ignoredMethods);
          }
        }
      }

      if (callee.type === 'MemberExpression') {
        // detect call app.use(csurf(...))
        if (
          isIdentifier(callee.property, 'use') &&
          isCsurfMiddleware(callExpression.arguments[0])
        ) {
          globalCsrfProtection = true;
        }
        if (
          isIdentifier(callee.property, 'post', 'put', 'delete', 'patch') &&
          !globalCsrfProtection &&
          usesCsrfMiddleware &&
          !callExpression.arguments.some(arg => isCsurfMiddleware(arg))
        ) {
          context.report({
            message: toEncodedMessage('Make sure not using CSRF protection is safe here.', []),
            node: callee,
          });
        }
      }
    }

    return {
      Program() {
        globalCsrfProtection = false;
      },
      CallExpression(node: estree.Node) {
        checkCallExpression(node as estree.CallExpression);
      },
    };
  },
};
