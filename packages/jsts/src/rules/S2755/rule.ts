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
// https://sonarsource.github.io/rspec/#/rspec/S2755/javascript

import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import * as estree from 'estree';
import { getProperty, getFullyQualifiedName, report, toSecondaryLocation } from '../helpers';
import { SONAR_RUNTIME } from '../helpers';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

const XML_LIBRARY = 'libxmljs';
const XML_PARSERS = ['parseXml', 'parseXmlString'];

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
    function isXmlParserCall(call: estree.CallExpression) {
      const fqn = getFullyQualifiedName(context, call);
      return XML_PARSERS.some(parser => fqn === `${XML_LIBRARY}.${parser}`);
    }

    function isNoEntSet(property: estree.Property) {
      return property.value.type === 'Literal' && property.value.raw === 'true';
    }

    return {
      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        if (isXmlParserCall(call)) {
          const noent = getProperty(call.arguments[1], 'noent', context);
          if (noent && isNoEntSet(noent)) {
            report(
              context,
              {
                message: 'Disable access to external entities in XML parsing.',
                node: noent,
              },
              [toSecondaryLocation(call.callee as TSESTree.Node)],
            );
          }
        }
      },
    };
  },
};
