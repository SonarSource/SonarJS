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
// https://sonarsource.github.io/rspec/#/rspec/S4502/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  flattenArgs,
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  isIdentifier,
  isLiteral,
  isRequireModule,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const CSURF_MODULE = 'csurf';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
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
          report(
            context,
            {
              message: 'Make sure disabling CSRF protection is safe here.',
              node: first,
            },
            rest.map(node => toSecondaryLocation(node)),
          );
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
          report(context, {
            message: 'Make sure not using CSRF protection is safe here.',
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
