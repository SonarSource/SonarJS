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
// https://jira.sonarsource.com/browse/RSPEC-5659

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfNode,
  getObjectExpressionProperty,
  getValueOfExpression,
  isIdentifier,
  toEncodedMessage,
} from './utils';

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
    const SIGN_MESSAGE = 'Use only strong cipher algorithms when signing this JWT.';
    const VERIFY_MESSAGE =
      'Use only strong cipher algorithms when verifying the signature of this JWT.';

    function checkCallToSign(
      callExpression: estree.CallExpression,
      thirdArgumentValue: estree.ObjectExpression,
      secondaryLocations: estree.Node[],
    ) {
      const algorithmProperty = getObjectExpressionProperty(thirdArgumentValue, 'algorithm');
      if (!algorithmProperty) {
        return;
      }
      const algorithmValue = getValueOfExpression<estree.Literal>(
        context,
        algorithmProperty.value,
        'Literal',
      );
      if (algorithmValue?.value === 'none') {
        if (algorithmValue !== algorithmProperty.value) {
          secondaryLocations.push(algorithmValue);
        }
        context.report({
          node: callExpression.callee,
          message: toEncodedMessage(SIGN_MESSAGE, secondaryLocations),
        });
      }
    }

    function checkCallToVerify(
      callExpression: estree.CallExpression,
      thirdArgumentValue: estree.ObjectExpression,
      secondaryLocations: estree.Node[],
    ) {
      const algorithmsProperty = getObjectExpressionProperty(thirdArgumentValue, 'algorithms');
      if (!algorithmsProperty) {
        context.report({
          node: callExpression.callee,
          message: toEncodedMessage(VERIFY_MESSAGE, secondaryLocations),
        });
        return;
      }
      const algorithmsValue = getValueOfExpression<estree.ArrayExpression>(
        context,
        algorithmsProperty.value,
        'ArrayExpression',
      );
      if (!algorithmsValue) {
        return;
      }
      const algorithmsContainNone = algorithmsValue.elements.some(e => {
        const value = getValueOfExpression<estree.Literal>(context, e, 'Literal');
        return value?.value === 'none';
      });
      if (algorithmsContainNone) {
        if (algorithmsProperty.value !== algorithmsValue) {
          secondaryLocations.push(algorithmsValue);
        }
        context.report({
          node: callExpression.callee,
          message: toEncodedMessage(VERIFY_MESSAGE, secondaryLocations),
        });
      }
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression: estree.CallExpression = node as estree.CallExpression;
        const callee = callExpression.callee;
        if (callee.type === 'MemberExpression') {
          const object = callee.object;
          const moduleName = getModuleNameOfNode(context, object);
          if (moduleName?.value !== 'jsonwebtoken') {
            return;
          }
          const isCallToSign = isIdentifier(callee.property, 'sign');
          const isCallToVerify = isIdentifier(callee.property, 'verify');
          if (callExpression.arguments.length < 3) {
            // algorithm(s) property is contained in third argument of "sign" and "verify" calls
            return;
          }
          const thirdArgument = callExpression.arguments[2];
          const thirdArgumentValue = getValueOfExpression<estree.ObjectExpression>(
            context,
            thirdArgument,
            'ObjectExpression',
          );
          if (!thirdArgumentValue) {
            return;
          }
          const secondaryLocations: estree.Node[] = [thirdArgumentValue];
          if (thirdArgumentValue !== thirdArgument) {
            secondaryLocations.push(thirdArgument);
          }
          if (isCallToSign) {
            checkCallToSign(callExpression, thirdArgumentValue, secondaryLocations);
          }
          if (isCallToVerify) {
            checkCallToVerify(callExpression, thirdArgumentValue, secondaryLocations);
          }
        }
      },
    };
  },
};
