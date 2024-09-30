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
// https://sonarsource.github.io/rspec/#/rspec/S5659/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getPropertyWithValue,
  getValueOfExpression,
  isNullLiteral,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    const SIGN_MESSAGE = 'Use only strong cipher algorithms when signing this JWT.';
    const VERIFY_MESSAGE =
      'Use only strong cipher algorithms when verifying the signature of this JWT.';
    const SECONDARY_MESSAGE = `The "algorithms" option should be defined and should not contain 'none'.`;

    function checkCallToSign(
      callExpression: estree.CallExpression,
      thirdArgumentValue: estree.ObjectExpression,
      secondaryLocations: estree.Node[],
    ) {
      const unsafeAlgorithmProperty = getPropertyWithValue(
        context,
        thirdArgumentValue,
        'algorithm',
        'none',
      );
      if (unsafeAlgorithmProperty) {
        const unsafeAlgorithmValue = getValueOfExpression(
          context,
          unsafeAlgorithmProperty.value,
          'Literal',
        );
        if (unsafeAlgorithmValue && unsafeAlgorithmValue !== unsafeAlgorithmProperty.value) {
          secondaryLocations.push(unsafeAlgorithmValue);
        }
        raiseIssueOn(callExpression.callee, SIGN_MESSAGE, secondaryLocations);
      }
    }

    function checkCallToVerify(
      callExpression: estree.CallExpression,
      publicKey: estree.Node,
      thirdArgumentValue: estree.ObjectExpression,
      secondaryLocations: estree.Node[],
    ) {
      const algorithmsProperty = getProperty(thirdArgumentValue, 'algorithms', context);
      if (!algorithmsProperty) {
        if (isNullLiteral(publicKey)) {
          raiseIssueOn(callExpression.callee, VERIFY_MESSAGE, secondaryLocations);
        }
        return;
      }
      const algorithmsValue = getValueOfExpression(
        context,
        algorithmsProperty.value,
        'ArrayExpression',
      );
      if (!algorithmsValue) {
        return;
      }
      const algorithmsContainNone = algorithmsValue.elements.some(e => {
        const value = getValueOfExpression(context, e, 'Literal');
        return value?.value === 'none';
      });
      if (algorithmsContainNone) {
        if (algorithmsProperty.value !== algorithmsValue) {
          secondaryLocations.push(algorithmsValue);
        }
        raiseIssueOn(callExpression.callee, VERIFY_MESSAGE, secondaryLocations);
      }
    }

    function raiseIssueOn(node: estree.Node, message: string, secondaryLocations: estree.Node[]) {
      report(
        context,
        {
          node,
          message,
        },
        secondaryLocations.map(node => toSecondaryLocation(node, SECONDARY_MESSAGE)),
      );
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression: estree.CallExpression = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpression);
        const isCallToSign = fqn === 'jsonwebtoken.sign';
        const isCallToVerify = fqn === 'jsonwebtoken.verify';
        if (!isCallToSign && !isCallToVerify) {
          return;
        }
        if (callExpression.arguments.length < 3) {
          // algorithm(s) property is contained in third argument of "sign" and "verify" calls
          return;
        }
        const thirdArgument = callExpression.arguments[2];
        const thirdArgumentValue = getValueOfExpression(context, thirdArgument, 'ObjectExpression');
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
        const secondArgument = callExpression.arguments[1];
        if (isCallToVerify) {
          checkCallToVerify(callExpression, secondArgument, thirdArgumentValue, secondaryLocations);
        }
      },
    };
  },
};
