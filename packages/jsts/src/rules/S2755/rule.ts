/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S2755/javascript

import { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

const XML_LIBRARY = 'libxmljs';
const XML_PARSERS = ['parseXml', 'parseXmlString'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
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
