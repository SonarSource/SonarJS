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
// https://sonarsource.github.io/rspec/#/rspec/S1874/javascript

import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import * as estree from 'estree';
import { getParent, isRequiredParserServices, RequiredParserServices } from './helpers';
import * as ts from 'typescript';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      deprecation: "'{{symbol}}' is deprecated. {{reason}}",
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      Identifier: (node: estree.Node) => {
        const parent = getParent(context);
        if (isShortHandProperty(parent) && parent.key === node) {
          // to not report twice
          return;
        }
        if (isObjectExpressionProperty(node, context)) {
          return;
        }
        const id = node as estree.Identifier;
        const insideImportExport = context.getAncestors().some(anc => anc.type.includes('Import'));
        if (insideImportExport || isDeclaration(id, context)) {
          return;
        }

        const deprecation = getDeprecation(id, services, context);
        if (deprecation) {
          context.report({
            node,
            messageId: 'deprecation',
            data: {
              symbol: id.name,
              reason: deprecation.reason,
            },
          });
        }
      },
    };
  },
};

function isDeclaration(id: estree.Identifier, context: Rule.RuleContext) {
  const parent = getParent(context);
  if (isShortHandProperty(parent) && parent.value === id) {
    return false;
  }

  const variable = context.getScope().variables.find(v => v.name === id.name);
  if (variable) {
    return variable.defs.some(def => def.name === id);
  }

  const declarationTypes = [
    'PropertyDefinition',
    'TSPropertySignature',
    'TSDeclareFunction',
    'FunctionDeclaration',
    'MethodDefinition',
    'TSMethodSignature',
  ];
  return parent && declarationTypes.includes(parent.type);
}

function getDeprecation(
  id: estree.Identifier,
  services: RequiredParserServices,
  context: Rule.RuleContext,
): Deprecation | undefined {
  const tc = services.program.getTypeChecker();
  const callExpression = getCallExpression(context, id);

  if (callExpression) {
    const tsCallExpression = services.esTreeNodeToTSNodeMap.get(callExpression as TSESTree.Node);
    const signature = tc.getResolvedSignature(tsCallExpression as ts.CallLikeExpression);
    if (signature) {
      const deprecation = getJsDocDeprecation(signature.getJsDocTags());
      if (deprecation) {
        return deprecation;
      }
    }
  }
  const symbol = getSymbol(id, services, context, tc);

  if (!symbol) {
    return undefined;
  }
  if (callExpression && isFunction(symbol)) {
    return undefined;
  }

  return getJsDocDeprecation(symbol.getJsDocTags());
}

function getSymbol(
  id: estree.Identifier,
  services: RequiredParserServices,
  context: Rule.RuleContext,
  tc: ts.TypeChecker,
) {
  let symbol: ts.Symbol | undefined;
  const tsId = services.esTreeNodeToTSNodeMap.get(id as TSESTree.Node) as ts.Identifier;
  const parent = services.esTreeNodeToTSNodeMap.get(getParent(context) as TSESTree.Node) as ts.Node;
  if (parent.kind === ts.SyntaxKind.BindingElement) {
    symbol = tc.getTypeAtLocation(parent.parent).getProperty(tsId.text);
  } else if (
    (isPropertyAssignment(parent) && parent.name === tsId) ||
    (isShorthandPropertyAssignment(parent) && parent.name === tsId)
  ) {
    try {
      symbol = tc.getPropertySymbolOfDestructuringAssignment(tsId);
    } catch (e) {
      // do nothing, we are in object literal, not destructuring
      // no obvious easy way to check that in advance
    }
  } else {
    symbol = tc.getSymbolAtLocation(tsId);
  }

  if (symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    return tc.getAliasedSymbol(symbol);
  }
  return symbol;
}

function getCallExpression(
  context: Rule.RuleContext,
  id: estree.Node,
): estree.CallExpression | estree.TaggedTemplateExpression | undefined {
  const ancestors = context.getAncestors();
  let callee = id;
  let parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : undefined;

  if (parent && parent.type === 'MemberExpression' && parent.property === id) {
    callee = parent;
    parent = ancestors.length > 1 ? ancestors[ancestors.length - 2] : undefined;
  }

  if (isCallExpression(parent, callee)) {
    return parent;
  }
}

function isCallExpression(
  node: estree.Node | undefined,
  callee: estree.Node,
): node is estree.CallExpression | estree.TaggedTemplateExpression {
  if (node) {
    if (node.type === 'NewExpression' || node.type === 'CallExpression') {
      return node.callee === callee;
    } else if (node.type === 'TaggedTemplateExpression') {
      return node.tag === callee;
    }
  }
  return false;
}

function getJsDocDeprecation(tags: ts.JSDocTagInfo[]): Deprecation | undefined {
  for (const tag of tags) {
    if (tag.name === 'deprecated') {
      return tag.text ? { reason: tag.text.map(e => e.text).join(' ') } : new Deprecation();
    }
  }
  return undefined;
}

function isFunction(symbol: ts.Symbol) {
  const { declarations } = symbol;
  if (declarations === undefined || declarations.length === 0) {
    return false;
  }
  switch (declarations[0].kind) {
    case ts.SyntaxKind.MethodDeclaration:
    case ts.SyntaxKind.FunctionDeclaration:
    case ts.SyntaxKind.FunctionExpression:
    case ts.SyntaxKind.MethodSignature:
      return true;
    default:
      return false;
  }
}

function isPropertyAssignment(node: ts.Node): node is ts.PropertyAssignment {
  return node.kind === ts.SyntaxKind.PropertyAssignment;
}

function isShorthandPropertyAssignment(node: ts.Node): node is ts.ShorthandPropertyAssignment {
  return node.kind === ts.SyntaxKind.ShorthandPropertyAssignment;
}

function isShortHandProperty(parent: estree.Node | undefined): parent is estree.Property {
  return !!parent && parent.type === 'Property' && parent.shorthand;
}

function isObjectExpressionProperty(node: estree.Node, context: Rule.RuleContext) {
  const ancestors = context.getAncestors();
  const parent = ancestors.pop();
  const grandparent = ancestors.pop();
  return (
    parent?.type === 'Property' &&
    !parent.computed &&
    !parent.shorthand &&
    parent.key === node &&
    grandparent?.type === 'ObjectExpression'
  );
}

class Deprecation {
  reason = '';
}
