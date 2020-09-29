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
    function checkCallToSign(
      callExpression: estree.CallExpression,
      thirdArgumentValue: estree.ObjectExpression,
      secondaryLocations: estree.Node[],
    ) {
      const algorithmProperty = getObjectExpressionProperty(thirdArgumentValue, 'algorithm');
      if (!algorithmProperty) {
        return;
      }
      const algorithmValue =
        algorithmProperty.value.type === 'Literal'
          ? algorithmProperty.value
          : (getValueOfExpression(context, algorithmProperty.value, 'Literal') as estree.Literal);
      if (algorithmValue?.value === 'none') {
        if (algorithmValue !== algorithmProperty.value) {
          secondaryLocations.push(algorithmValue);
        }
        context.report({
          node: callExpression.callee,
          message: toEncodedMessage(
            'Use only strong cipher algorithms when signing this JWT.',
            secondaryLocations,
          ),
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
          message: toEncodedMessage(
            'Use only strong cipher algorithms when verifying the signature of this JWT.',
            secondaryLocations,
          ),
        });
        return;
      }
      const algorithmsValue =
        algorithmsProperty.value.type === 'ArrayExpression'
          ? algorithmsProperty.value
          : (getValueOfExpression(
              context,
              algorithmsProperty.value,
              'ArrayExpression',
            ) as estree.ArrayExpression);
      if (!algorithmsValue) {
        return;
      }
      const algorithmsContainNone = algorithmsValue.elements.some(e => {
        const value =
          e.type === 'Literal'
            ? e.value
            : (getValueOfExpression(context, e, 'Literal') as estree.Literal)?.value;
        return value === 'none';
      });
      if (algorithmsContainNone) {
        if (algorithmsProperty.value !== algorithmsValue) {
          secondaryLocations.push(algorithmsValue);
        }
        context.report({
          node: callExpression.callee,
          message: toEncodedMessage(
            'Use only strong cipher algorithms when verifying the signature of this JWT.',
            secondaryLocations,
          ),
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
          const isCallToSign = isPropertyNamed(callee, 'sign');
          const isCallToVerify = isPropertyNamed(callee, 'verify');
          if (callExpression.arguments.length < 3) {
            // algorithm(s) property is contained in third argument of "sign" and "verify" calls
            return;
          }
          const thirdArgument = callExpression.arguments[2];
          const thirdArgumentValue =
            thirdArgument.type === 'ObjectExpression'
              ? thirdArgument
              : (getValueOfExpression(
                  context,
                  thirdArgument,
                  'ObjectExpression',
                ) as estree.ObjectExpression);
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

function isPropertyNamed(memberExpression: estree.MemberExpression, name: string) {
  return memberExpression.property.type === 'Identifier' && memberExpression.property.name === name;
}
