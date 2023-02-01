/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4782/javascript

import { Rule, AST } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { isRequiredParserServices, toEncodedMessage } from './helpers';
import { SONAR_RUNTIME } from 'linting/eslint/linter/parameters';

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    if (!isRequiredParserServices(context.parserServices)) {
      return {};
    }

    function checkProperty(node: estree.Node) {
      const tsNode = node as TSESTree.Node as
        | TSESTree.PropertyDefinition
        | TSESTree.TSPropertySignature;
      const optionalToken = context
        .getSourceCode()
        .getFirstToken(node, token => token.value === '?');
      if (!tsNode.optional || !optionalToken) {
        return;
      }

      const typeNode = getUndefinedTypeAnnotation(tsNode.typeAnnotation);
      if (typeNode) {
        const suggest = getQuickFixSuggestions(context, optionalToken, typeNode);
        const secondaryLocations = [typeNode];
        const message = toEncodedMessage(
          "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
          secondaryLocations,
        );
        context.report({
          message,
          loc: optionalToken.loc,
          suggest,
        });
      }
    }

    return {
      'PropertyDefinition, TSPropertySignature': (node: estree.Node) => checkProperty(node),
    };
  },
};

function getUndefinedTypeAnnotation(tsTypeAnnotation?: TSESTree.TSTypeAnnotation) {
  if (tsTypeAnnotation) {
    return getUndefinedTypeNode(tsTypeAnnotation.typeAnnotation);
  }
  return undefined;
}

function getUndefinedTypeNode(typeNode: TSESTree.TypeNode): TSESTree.TypeNode | undefined {
  if (typeNode.type === 'TSUndefinedKeyword') {
    return typeNode;
  } else if (typeNode.type === 'TSUnionType') {
    return typeNode.types.map(getUndefinedTypeNode).find(tpe => tpe !== undefined);
  }
  return undefined;
}

function getQuickFixSuggestions(
  context: Rule.RuleContext,
  optionalToken: AST.Token,
  undefinedType: TSESTree.TypeNode,
): Rule.SuggestionReportDescriptor[] {
  const suggestions: Rule.SuggestionReportDescriptor[] = [
    {
      desc: 'Remove "?" operator',
      fix: fixer => fixer.remove(optionalToken),
    },
  ];
  if (undefinedType.parent?.type === 'TSUnionType') {
    suggestions.push(getUndefinedRemovalSuggestion(context, undefinedType));
  }
  return suggestions;
}

function getUndefinedRemovalSuggestion(
  context: Rule.RuleContext,
  undefinedType: TSESTree.TypeNode,
): Rule.SuggestionReportDescriptor {
  return {
    desc: 'Remove "undefined" type annotation',
    fix: fixer => {
      const fixes: Rule.Fix[] = [];
      const unionType = undefinedType.parent as TSESTree.TSUnionType;
      if (unionType.types.length === 2) {
        const unionTypeNode = unionType as any as estree.Node;
        const otherType =
          unionType.types[0] === undefinedType ? unionType.types[1] : unionType.types[0];
        const otherTypeText = context.getSourceCode().getText(otherType as any as estree.Node);
        fixes.push(fixer.replaceText(unionTypeNode, otherTypeText));

        const tokenBefore = context.getSourceCode().getTokenBefore(unionTypeNode);
        const tokenAfter = context.getSourceCode().getTokenAfter(unionTypeNode);
        if (tokenBefore?.value === '(' && tokenAfter?.value === ')') {
          fixes.push(fixer.remove(tokenBefore));
          fixes.push(fixer.remove(tokenAfter));
        }
      } else {
        const index = unionType.types.indexOf(undefinedType);
        if (index === 0) {
          fixes.push(fixer.removeRange([undefinedType.range[0], unionType.types[1].range[0]]));
        } else {
          fixes.push(
            fixer.removeRange([unionType.types[index - 1].range[1], undefinedType.range[1]]),
          );
        }
      }
      return fixes;
    },
  };
}
