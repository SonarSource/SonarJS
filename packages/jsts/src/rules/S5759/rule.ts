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
// https://sonarsource.github.io/rspec/#/rspec/S5759/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getValueOfExpression,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee, arguments: args } = call;
        if (isSensitiveFQN(context, call) && args.length > 0) {
          const xfwdProp = getProperty(args[0], 'xfwd', context);
          if (!xfwdProp) {
            return;
          }
          const xfwdValue = getValueOfExpression(context, xfwdProp.value, 'Literal');
          if (xfwdValue?.value === true) {
            report(
              context,
              {
                node: callee,
                message: 'Make sure forwarding client IP address is safe here.',
              },
              [toSecondaryLocation(xfwdProp)],
            );
          }
        }
      },
    };
  },
};

function isSensitiveFQN(context: Rule.RuleContext, call: estree.CallExpression) {
  const fqn = getFullyQualifiedName(context, call);
  return (
    fqn &&
    ['http-proxy.createProxyServer', 'http-proxy-middleware.createProxyMiddleware'].includes(fqn)
  );
}
