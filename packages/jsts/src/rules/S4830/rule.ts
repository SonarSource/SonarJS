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
// https://sonarsource.github.io/rspec/#/rspec/S4830/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getValueOfExpression,
  getPropertyWithValue,
  getFullyQualifiedName,
  report,
  IssueLocation,
  toSecondaryLocation,
} from '../helpers';
import { SONAR_RUNTIME } from '../helpers';
import { generateMeta } from '../helpers';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
  create(context: Rule.RuleContext) {
    const MESSAGE = 'Enable server certificate validation on this SSL/TLS connection.';
    const SECONDARY_MESSAGE = 'Set "rejectUnauthorized" to "true".';
    function checkSensitiveArgument(
      callExpression: estree.CallExpression,
      sensitiveArgumentIndex: number,
    ) {
      if (callExpression.arguments.length < sensitiveArgumentIndex + 1) {
        return;
      }
      const sensitiveArgument = callExpression.arguments[sensitiveArgumentIndex];
      const secondaryLocations: IssueLocation[] = [];
      const argumentValue = getValueOfExpression(context, sensitiveArgument, 'ObjectExpression');
      if (!argumentValue) {
        return;
      }
      if (sensitiveArgument !== argumentValue) {
        secondaryLocations.push(toSecondaryLocation(argumentValue));
      }
      const unsafeRejectUnauthorizedConfiguration = getPropertyWithValue(
        context,
        argumentValue,
        'rejectUnauthorized',
        false,
      );
      if (unsafeRejectUnauthorizedConfiguration) {
        secondaryLocations.push(
          toSecondaryLocation(unsafeRejectUnauthorizedConfiguration, SECONDARY_MESSAGE),
        );
        report(
          context,
          {
            node: callExpression.callee,
            message: MESSAGE,
          },
          secondaryLocations,
        );
      }
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpression);
        if (fqn === 'https.request') {
          checkSensitiveArgument(callExpression, 0);
        }
        if (fqn === 'request.get') {
          checkSensitiveArgument(callExpression, 0);
        }
        if (fqn === 'tls.connect') {
          checkSensitiveArgument(callExpression, 2);
        }
      },
    };
  },
};
