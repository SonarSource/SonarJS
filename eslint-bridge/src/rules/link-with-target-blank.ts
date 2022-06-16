/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5148/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { URL } from 'url';
import { isIdentifier, isMethodCall, isStringLiteral } from '../utils';

const REQUIRED_OPTION = 'noopener';
const PLACE_OF_REQUIRED_OPTION = 2;
const PLACE_OF_URL = 0;

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      issue: 'Make sure not using "noopener" is safe here.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.CallExpression) => {
        if (!isMethodCall(node)) {
          return;
        }
        const { property, object } = node.callee;

        if (!(isIdentifier(property, 'open') && isIdentifier(object, 'window'))) {
          return;
        }
        const args = node.arguments;
        if (args.length > 0 && !isUrl(args[PLACE_OF_URL])) {
          return;
        }
        if (args.length <= PLACE_OF_REQUIRED_OPTION || !hasRequiredOption(args[PLACE_OF_REQUIRED_OPTION])) {
          context.report({
            messageId: 'issue',
            node: property,
          });
        }
      },
    };
  },
};

function hasRequiredOption(argument: estree.Node) {
  if (!isStringLiteral(argument)) {
    return false;
  }
  return argument.value?.includes(REQUIRED_OPTION);
}

function isUrl(argument: estree.Node): boolean {
  if (!isStringLiteral(argument)) {
    return false;
  }
  try {
    new URL(argument.value);
    return true;
  } catch (_) {
    return false;
  }
}
