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
// https://jira.sonarsource.com/browse/RSPEC-2817

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isRequiredParserServices } from '../utils/isRequiredParserServices';
import { getTypeAsString, isIdentifier } from './utils';

const MESSAGE = 'Convert this use of a Web SQL database to another technology.';
const OPEN_DATABASE = 'openDatabase';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const { callee } = callExpression;
        if (isIdentifier(callee, OPEN_DATABASE)) {
          context.report({ node: callee, message: MESSAGE });
        }
        if (callee.type !== 'MemberExpression' || !isIdentifier(callee.property, OPEN_DATABASE)) {
          return;
        }
        const typeName = getTypeAsString(callee.object, services);
        if (typeName.match(/window/i) || typeName.match(/globalThis/i)) {
          context.report({ node: callee, message: MESSAGE });
        }
      },
    };
  },
};
