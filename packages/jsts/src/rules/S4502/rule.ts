/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4502/javascript

import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  isIdentifier,
  isLiteral,
  flattenArgs,
  toEncodedMessage,
  getFullyQualifiedName,
  isRequireModule,
  getProperty,
} from '../helpers';
import { SONAR_RUNTIME } from '../parameters';

const CSURF_MODULE = 'csurf';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
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
      return node && getFullyQualifiedName(context, node) === CSURF_MODULE;
    }

    function checkCallExpression(callExpression: estree.CallExpression) {
      const { callee } = callExpression;

      // require('csurf')
      if (isRequireModule(callExpression, CSURF_MODULE)) {
        importedCsrfMiddleware = true;
      }

      // csurf(...)
      if (getFullyQualifiedName(context, callee) === CSURF_MODULE) {
        const [args] = callExpression.arguments;
        const ignoredMethods = getProperty(args, 'ignoreMethods', context);
        if (ignoredMethods) {
          checkIgnoredMethods(ignoredMethods);
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
