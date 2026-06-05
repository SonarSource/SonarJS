/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import type { AST, Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { classifyTypesByOrigin } from '../helpers/type-origin.js';
import { childrenOf } from '../helpers/ancestor.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { hasSuggestions: true }),

  create(context: Rule.RuleContext) {
    const parserServices = context.sourceCode.parserServices;
    const hasTypeChecking = isRequiredParserServices(parserServices);
    const compilerOptions = hasTypeChecking
      ? parserServices.program.getCompilerOptions()
      : undefined;
    if (compilerOptions?.exactOptionalPropertyTypes) {
      return {};
    }
    const canResolveTypes = hasTypeChecking
      ? (compilerOptions?.strictNullChecks ?? compilerOptions?.strict ?? false)
      : false;

    function checkProperty(node: estree.Node) {
      const tsNode = node as TSESTree.Node as
        | TSESTree.PropertyDefinition
        | TSESTree.TSPropertySignature;
      const optionalToken = context.sourceCode.getFirstToken(node, token => token.value === '?');
      const rootType = tsNode.typeAnnotation?.typeAnnotation;
      if (!tsNode.optional || !optionalToken || !rootType) {
        return;
      }

      let typeNode: TSESTree.TypeNode | undefined;
      if (rootType.type === 'TSUnionType') {
        typeNode = findSyntacticUndefinedTypeNode(rootType);
      }

      if (!typeNode && canResolveTypes) {
        typeNode = findSemanticUndefinedTypeNode(
          rootType,
          parserServices as RequiredParserServices,
          context.sourceCode.visitorKeys,
        );
      }

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

function findSemanticUndefinedTypeNode(
  rootType: TSESTree.TypeNode,
  services: RequiredParserServices,
  visitorKeys: SourceCode.VisitorKeys,
): TSESTree.TypeNode | undefined {
  const tsTypeNode = services.esTreeNodeToTSNodeMap.get(rootType);
  const checker: ts.TypeChecker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(tsTypeNode);
  if (!type.isUnion()) {
    return undefined;
  }
  const hasUndefined = type.types.some(t => (t.flags & ts.TypeFlags.Undefined) !== 0);
  const hasNonUndefined = type.types.some(t => (t.flags & ts.TypeFlags.Undefined) === 0);
  if (!hasUndefined || !hasNonUndefined) {
    return undefined;
  }
  // If the user wrote `... | undefined` anywhere in the annotation (e.g. as a
  // type argument to an external generic like Vue's `MaybeRef`), the inline
  // keyword is editable — flag without consulting the internal/external split.
  if (hasInlineUnionPositionUndefined(rootType, visitorKeys)) {
    return rootType;
  }
  // Otherwise `undefined` must come from a declaration: only flag when it's
  // reachable from a user-editable (internal) top-level member. Pure external
  // references like `React.ReactNode` stay suppressed.
  const { internal } = classifyTypesByOrigin(rootType, services);
  const undefinedReachableFromInternal = internal.some(member =>
    resolvedTypeContainsUndefined(member, services),
  );
  return undefinedReachableFromInternal ? rootType : undefined;
}

function hasInlineUnionPositionUndefined(
  root: TSESTree.TypeNode,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  const stack: estree.Node[] = [root as unknown as estree.Node];
  while (stack.length > 0) {
    const node = stack.pop() as estree.Node;
    if ((node as TSESTree.Node).type === 'TSUndefinedKeyword' && isInUnionPosition(node)) {
      return true;
    }
    stack.push(...childrenOf(node, visitorKeys));
  }
  return false;
}

function isInUnionPosition(node: estree.Node): boolean {
  return (node as TSESTree.Node).parent?.type === 'TSUnionType';
}

function resolvedTypeContainsUndefined(
  node: TSESTree.TypeNode,
  services: RequiredParserServices,
): boolean {
  const tsNode = services.esTreeNodeToTSNodeMap.get(node);
  const type = services.program.getTypeChecker().getTypeAtLocation(tsNode);
  const members = type.isUnion() ? type.types : [type];
  return members.some(t => (t.flags & ts.TypeFlags.Undefined) !== 0);
}

function findSyntacticUndefinedTypeNode(
  typeNode: TSESTree.TypeNode,
): TSESTree.TypeNode | undefined {
  if (typeNode.type === 'TSUndefinedKeyword') {
    return typeNode;
  }
  if (typeNode.type === 'TSUnionType') {
    return typeNode.types.map(findSyntacticUndefinedTypeNode).find(tpe => tpe !== undefined);
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
          fixes.push(fixer.remove(tokenBefore), fixer.remove(tokenAfter));
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
