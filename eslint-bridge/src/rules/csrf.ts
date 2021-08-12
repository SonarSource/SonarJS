/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule } from 'eslint';
import { toEncodedMessage } from 'eslint-plugin-sonarjs/lib/utils/locations';
import * as estree from 'estree';
import {
  isIdentifier,
  isLiteral,
  getUniqueWriteUsage,
  getModuleNameOfIdentifier,
  getModuleNameFromRequire,
  getObjectExpressionProperty,
  flattenArgs,
} from '../utils';

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
    let importedCsrfMiddleware = false;

    function checkIgnoredMethods(node: estree.Property) {
      if (node.value.type === 'ArrayExpression') {
        const arrayExpr = node.value;
        const unsafeMethods = arrayExpr.elements
          .filter(isLiteral)
          .filter(e => typeof e.value === 'string' && !SAFE_METHODS.includes(e.value));
        if (unsafeMethods.length > 0) {
          const [first, ...rest] = unsafeMethods;
          context.report({
            message: toEncodedMessage(
              'Make sure disabling CSRF protection is safe here.',
              rest as TSESTree.Node[],
            ),
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
        const module = getModuleNameOfIdentifier(context, node.callee);
        return module?.value === CSURF_MODULE;
      }
      return false;
    }

    function checkCallExpression(callExpression: estree.CallExpression) {
      const { callee } = callExpression;

      // require('csurf')
      const requiredModule = getModuleNameFromRequire(callExpression);
      if (requiredModule?.value === CSURF_MODULE) {
        importedCsrfMiddleware = true;
      }

      // csurf(...)
      if (callee.type === 'Identifier') {
        const moduleName = getModuleNameOfIdentifier(context, callee);

        if (moduleName?.value === CSURF_MODULE) {
          const [args] = callExpression.arguments;
          const ignoredMethods = getObjectExpressionProperty(args, 'ignoreMethods');
          if (ignoredMethods) {
            checkIgnoredMethods(ignoredMethods);
          }
        }
      }

      // app.use(csurf(...))
      if (callee.type === 'MemberExpression') {
        if (
          isIdentifier(callee.property, 'use') &&
          flattenArgs(context, callExpression.arguments).find(isCsurfMiddleware)
        ) {
          globalCsrfProtection = true;
        }
        if (
          isIdentifier(callee.property, 'post', 'put', 'delete', 'patch') &&
          !globalCsrfProtection &&
          importedCsrfMiddleware &&
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
      ImportDeclaration(node: estree.Node) {
        if ((node as estree.ImportDeclaration).source.value === CSURF_MODULE) {
          importedCsrfMiddleware = true;
        }
      },
    };
  },
};
