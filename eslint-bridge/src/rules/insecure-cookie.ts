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
// https://jira.sonarsource.com/browse/RSPEC-2092

import { Rule } from 'eslint';
import { toEncodedMessage } from 'eslint-plugin-sonarjs/lib/utils/locations';
import * as estree from 'estree';
import {
  getModuleNameOfNode,
  getObjectExpressionProperty,
  getValueOfExpression,
  isIdentifier,
} from './utils';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const MESSAGE = 'Make sure creating this cookie without the "secure" flag is safe.';
    function checkCookieSession(callExpression: estree.CallExpression) {
      if (callExpression.arguments.length === 0) {
        return;
      }
      const firstArgument = callExpression.arguments[0];
      const objectExpression = getValueOfExpression<estree.ObjectExpression>(
        context,
        firstArgument,
        'ObjectExpression',
      );
      if (!objectExpression) {
        return;
      }
      const secureProperty = getObjectExpressionProperty(objectExpression, 'secure');
      if (!secureProperty) {
        return;
      }
      const securePropertyValue = getValueOfExpression<estree.Literal>(
        context,
        secureProperty.value,
        'Literal',
      );
      if (securePropertyValue?.value === false) {
        const secondaryLocations: estree.Node[] = [securePropertyValue];
        if (firstArgument !== objectExpression) {
          secondaryLocations.push(objectExpression);
        }
        context.report({
          node: callExpression.callee,
          message: toEncodedMessage(MESSAGE, secondaryLocations),
        });
      }
    }

    // Common method to check csurf and expression-session libraries, as both set cookies in a similar way
    function checkCsurfAndExpressSession(callExpression: estree.CallExpression, isCsurf: boolean) {
      if (callExpression.arguments.length === 0) {
        return;
      }
      const firstArgument = callExpression.arguments[0];
      const objectExpression = getValueOfExpression<estree.ObjectExpression>(
        context,
        firstArgument,
        'ObjectExpression',
      );
      if (!objectExpression) {
        return;
      }
      const cookieProperty = getObjectExpressionProperty(objectExpression, 'cookie');
      if (!cookieProperty) {
        return;
      }
      const cookiePropertyValue = getValueOfExpression<estree.ObjectExpression>(
        context,
        cookieProperty.value,
        'ObjectExpression',
      );
      if (cookiePropertyValue) {
        checkSecureFlagOnCookieExpression(
          cookiePropertyValue,
          firstArgument,
          objectExpression,
          callExpression,
        );
      } else if (isCsurf) {
        // csurf cookie property can be passed as a boolean literal, in which case "secure" is not enabled by default
        const cookiePropertyLiteral = getValueOfExpression<estree.Literal>(
          context,
          cookieProperty.value,
          'Literal',
        );
        if (cookiePropertyLiteral?.value === true) {
          context.report({
            node: callExpression.callee,
            message: toEncodedMessage(MESSAGE, [cookiePropertyLiteral]),
          });
        }
      }
    }

    function checkCookiesMethodCall(callExpression: estree.CallExpression) {
      if (!isIdentifier((callExpression.callee as estree.MemberExpression).property, 'set')) {
        return;
      }
      if (callExpression.arguments.length < 3) {
        // Sensitive argument is third argument for "cookies.set" calls
        return;
      }
      const thirdArgument = callExpression.arguments[2];
      const cookieObjectExpression = getValueOfExpression<estree.ObjectExpression>(
        context,
        thirdArgument,
        'ObjectExpression',
      );
      if (!cookieObjectExpression) {
        return;
      }
      const secureProperty = getObjectExpressionProperty(cookieObjectExpression, 'secure');
      if (!secureProperty) {
        return;
      }
      const securePropertyValue = getValueOfExpression<estree.Literal>(
        context,
        secureProperty.value,
        'Literal',
      );
      if (securePropertyValue?.value === false) {
        const secondaryLocations: estree.Node[] = [securePropertyValue];
        if (thirdArgument !== cookieObjectExpression) {
          secondaryLocations.push(cookieObjectExpression);
        }
        context.report({
          node: callExpression.callee,
          message: toEncodedMessage(MESSAGE, secondaryLocations),
        });
      }
    }

    function checkSecureFlagOnCookieExpression(
      cookiePropertyValue: estree.ObjectExpression,
      firstArgument: estree.Node,
      objectExpression: estree.ObjectExpression,
      callExpression: estree.CallExpression,
    ) {
      const secureProperty = getObjectExpressionProperty(cookiePropertyValue, 'secure');
      if (secureProperty) {
        const securePropertyValue = getValueOfExpression<estree.Literal>(
          context,
          secureProperty.value,
          'Literal',
        );
        if (securePropertyValue?.value === false) {
          const secondaryLocations: estree.Node[] = [securePropertyValue];
          if (firstArgument !== objectExpression) {
            secondaryLocations.push(objectExpression);
          }
          context.report({
            node: callExpression.callee,
            message: toEncodedMessage(MESSAGE, secondaryLocations),
          });
        }
      }
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const moduleName = getModuleNameOfNode(context, callExpression.callee);
        if (moduleName?.value === 'cookie-session') {
          checkCookieSession(callExpression);
          return;
        }
        if (moduleName?.value === 'csurf') {
          checkCsurfAndExpressSession(callExpression, true);
          return;
        }
        if (moduleName?.value === 'express-session') {
          checkCsurfAndExpressSession(callExpression, false);
          return;
        }
        const callee = callExpression.callee;
        if (callee.type === 'MemberExpression') {
          const objectValue = getValueOfExpression(
            context,
            callee.object,
            'NewExpression',
          ) as estree.NewExpression;
          if (objectValue) {
            const module = getModuleNameOfNode(context, objectValue.callee);
            if (module?.value === 'cookies') {
              checkCookiesMethodCall(callExpression);
            }
          }
        }
      },
    };
  },
};
