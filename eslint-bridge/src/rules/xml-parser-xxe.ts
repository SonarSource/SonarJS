/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-2755

import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule } from 'eslint';
import { toEncodedMessage } from 'eslint-plugin-sonarjs/lib/utils/locations';
import * as estree from 'estree';
import { getImportDeclarations, getRequireCalls, getObjectExpressionProperty } from '../utils';

const XML_LIBRARY = 'libxmljs';
const XML_PARSERS = ['parseXml', 'parseXmlString'];

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
    function isXmlParserCall(call: estree.CallExpression) {
      return (
        ((call.callee.type === 'Identifier' && XML_PARSERS.includes(call.callee.name)) ||
          (call.callee.type === 'MemberExpression' &&
            call.callee.property.type === 'Identifier' &&
            XML_PARSERS.includes(call.callee.property.name))) &&
        call.arguments.length > 1
      );
    }

    function isXmlLibraryInScope() {
      return isXmlLibraryImported() || isXmlLibraryRequired();
    }

    function isXmlLibraryImported() {
      return getImportDeclarations(context).findIndex(i => i.source.value === XML_LIBRARY) > -1;
    }

    function isXmlLibraryRequired() {
      return (
        getRequireCalls(context).findIndex(
          r => r.arguments[0].type === 'Literal' && r.arguments[0].value === XML_LIBRARY,
        ) > -1
      );
    }

    function isNoEntSet(property: estree.Property) {
      return property.value.type === 'Literal' && property.value.raw === 'true';
    }

    return {
      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        if (isXmlParserCall(call) && isXmlLibraryInScope()) {
          const noent = getObjectExpressionProperty(call.arguments[1], 'noent');
          if (noent && isNoEntSet(noent)) {
            context.report({
              message: toEncodedMessage('Disable access to external entities in XML parsing.', [
                call.callee as TSESTree.Node,
              ]),
              node: noent,
            });
          }
        }
      },
    };
  },
};
