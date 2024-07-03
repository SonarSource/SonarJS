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
// https://sonarsource.github.io/rspec/#/rspec/S1192

import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';
import { report, toSecondaryLocation } from '../helpers';
import { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { FromSchema } from 'json-schema-to-ts';

// Number of times a literal must be duplicated to trigger an issue
const MIN_LENGTH = 10;
const NO_SEPARATOR_REGEXP = /^\w*$/;
const EXCLUDED_CONTEXTS = [
  'ImportDeclaration',
  'ImportExpression',
  'JSXAttribute',
  'ExportAllDeclaration',
  'ExportNamedDeclaration',
];
const message = 'Define a constant instead of duplicating this literal {{times}} times.';

const DEFAULT_OPTIONS = {
  threshold: 3,
  ignoreStrings: 'application/json',
};

const messages = {
  defineConstant: message,
  sonarRuntime: '{{sonarRuntimeData}}',
};

const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 2,
  items: [
    {
      type: 'object',
      properties: {
        threshold: { type: 'integer', minimum: 2 },
        ignoreStrings: { type: 'string' },
      },
      additionalProperties: false,
    },
    {
      type: 'string',
      enum: ['sonar-runtime'] /* internal parameter for rules having secondary locations */,
    },
  ],
} as const satisfies JSONSchema4;

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, { messages, schema }),

  create(context) {
    const literalsByValue: Map<string, TSESTree.Literal[]> = new Map();
    const { threshold, ignoreStrings } = {
      ...DEFAULT_OPTIONS,
      ...(context.options as FromSchema<typeof schema>)[0],
    };
    const whitelist = ignoreStrings.split(',');
    return {
      Literal: (node: estree.Node) => {
        const literal = node as TSESTree.Literal;
        const { parent } = literal;
        if (
          typeof literal.value === 'string' &&
          parent &&
          !['ExpressionStatement', 'TSLiteralType'].includes(parent.type)
        ) {
          const stringContent = literal.value.trim();

          if (
            !whitelist.includes(literal.value) &&
            !isExcludedByUsageContext(context, literal) &&
            stringContent.length >= MIN_LENGTH &&
            !stringContent.match(NO_SEPARATOR_REGEXP)
          ) {
            const sameStringLiterals = literalsByValue.get(stringContent) || [];
            sameStringLiterals.push(literal);
            literalsByValue.set(stringContent, sameStringLiterals);
          }
        }
      },

      'Program:exit'() {
        literalsByValue.forEach(literals => {
          if (literals.length >= threshold) {
            const [primaryNode, ...secondaryNodes] = literals;
            const secondaryIssues = secondaryNodes.map(node =>
              toSecondaryLocation(node, 'Duplication'),
            );
            report(
              context,
              {
                message,
                node: primaryNode,
                data: { times: literals.length.toString() },
              },
              secondaryIssues,
            );
          }
        });
      },
    };
  },
};

function isExcludedByUsageContext(context: Rule.RuleContext, literal: estree.Literal) {
  const { parent } = literal as TSESTree.Literal;
  const parentType = parent.type;

  return (
    EXCLUDED_CONTEXTS.includes(parentType) ||
    isRequireContext(parent as estree.Node, context) ||
    isObjectPropertyKey(parent as estree.Node, literal)
  );
}

function isRequireContext(parent: estree.Node, context: Rule.RuleContext) {
  return (
    parent.type === 'CallExpression' && context.sourceCode.getText(parent.callee) === 'require'
  );
}

function isObjectPropertyKey(parent: estree.Node, literal: estree.Literal) {
  return parent.type === AST_NODE_TYPES.Property && parent.key === literal;
}
