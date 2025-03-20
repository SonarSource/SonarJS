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
// https://sonarsource.github.io/rspec/#/rspec/S4782/javascript

import { AST, Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  isRequiredParserServices,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { hasSuggestions: true }),

  create(context: Rule.RuleContext) {
    if (!isRequiredParserServices(context.sourceCode.parserServices)) {
      return {};
    }

    const compilerOptions = context.sourceCode.parserServices.program.getCompilerOptions();
    if (compilerOptions.exactOptionalPropertyTypes) {
      return {};
    }

    function checkProperty(node: estree.Node) {
      const tsNode = node as TSESTree.Node as
        | TSESTree.PropertyDefinition
        | TSESTree.TSPropertySignature;
      const optionalToken = context.sourceCode.getFirstToken(node, token => token.value === '?');
      if (!tsNode.optional || !optionalToken) {
        return;
      }

      const typeNode = getUndefinedTypeAnnotation(tsNode.typeAnnotation);
      if (typeNode) {
        const suggest = getQuickFixSuggestions(context, optionalToken, typeNode);

        report(
          context,
          {
            message:
              "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
            loc: optionalToken.loc,
            suggest,
          },
          [toSecondaryLocation(typeNode)],
        );
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
        const unionTypeNode = unionType as unknown as estree.Node;
        const otherType =
          unionType.types[0] === undefinedType ? unionType.types[1] : unionType.types[0];
        const otherTypeText = context.sourceCode.getText(otherType as unknown as estree.Node);
        fixes.push(fixer.replaceText(unionTypeNode, otherTypeText));

        const tokenBefore = context.sourceCode.getTokenBefore(unionTypeNode);
        const tokenAfter = context.sourceCode.getTokenAfter(unionTypeNode);
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
