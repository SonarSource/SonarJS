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
// https://sonarsource.github.io/rspec/#/rspec/S4830/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getPropertyWithValue,
  getValueOfExpression,
  IssueLocation,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
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
