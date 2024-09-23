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
// https://sonarsource.github.io/rspec/#/rspec/S5042/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getValueOfExpression,
  isIdentifier,
  isLiteral,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      safeExpanding: 'Make sure that expanding this archive file is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    function canBeProperty(prop: estree.Property | estree.SpreadElement, name: string) {
      return (
        prop.type === 'SpreadElement' ||
        isIdentifier(prop.key, name) ||
        (isLiteral(prop.key) && prop.key.value === name)
      );
    }

    function isSensitiveTarCall(call: estree.CallExpression, fqn: string | null) {
      if (fqn === 'tar.x') {
        const firstArg = call.arguments.length > 0 ? call.arguments[0] : null;
        if (!firstArg) {
          return false;
        }
        const firstArgValue = getValueOfExpression(context, firstArg, 'ObjectExpression');
        return (
          !!firstArgValue && !firstArgValue.properties.some(prop => canBeProperty(prop, 'filter'))
        );
      }
      return false;
    }

    function isSensitiveExtractZipCall(call: estree.CallExpression, fqn: string | null) {
      if (fqn === 'extract-zip') {
        const secondArg = call.arguments.length > 1 ? call.arguments[1] : null;
        if (!secondArg) {
          return false;
        }
        const secondArgValue = getValueOfExpression(context, secondArg, 'ObjectExpression');
        return (
          !!secondArgValue &&
          !secondArgValue.properties.some(prop => canBeProperty(prop, 'onEntry'))
        );
      }
      return false;
    }

    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, call);
        if (
          isSensitiveTarCall(call, fqn) ||
          isSensitiveExtractZipCall(call, fqn) ||
          fqn === 'jszip.loadAsync' ||
          fqn === 'yauzl.open' ||
          fqn === 'adm-zip.extractAllTo'
        ) {
          context.report({
            messageId: 'safeExpanding',
            node: call.callee,
          });
        }
      },
    };
  },
};
