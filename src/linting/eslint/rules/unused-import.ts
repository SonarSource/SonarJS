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
// https://sonarsource.github.io/rspec/#/rspec/S1128/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { AST } from 'vue-eslint-parser';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { isRequiredParserServices, removeNodeWithLeadingWhitespaces } from './helpers';

const EXCLUDED_IMPORTS = ['React'];

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      removeUnusedImport: `Remove this unused import of '{{symbol}}'.`,
      suggestRemoveWholeStatement: `Remove this import statement`,
      suggestRemoveOneVariable: `Remove this variable import`,
    },
    hasSuggestions: true,
  },
  create(context: Rule.RuleContext) {
    const isJsxPragmaSet =
      context
        .getSourceCode()
        .getAllComments()
        .findIndex(comment => comment.value.includes('@jsx jsx')) > -1;
    const unusedImports: { id: estree.Identifier; importDecl: estree.ImportDeclaration }[] = [];
    const tsTypeIdentifiers: Set<string> = new Set();
    const vueIdentifiers: Set<string> = new Set();
    const saveTypeIdentifier = (node: estree.Identifier) => tsTypeIdentifiers.add(node.name);

    function isExcluded(variable: Scope.Variable) {
      return EXCLUDED_IMPORTS.includes(variable.name);
    }

    function isUnused(variable: Scope.Variable) {
      return variable.references.length === 0;
    }

    function isImplicitJsx(variable: Scope.Variable) {
      return variable.name === 'jsx' && isJsxPragmaSet;
    }

    function getJsxFactories() {
      const factories = new Set<string>();
      const parserServices = context.parserServices;
      if (isRequiredParserServices(parserServices)) {
        const compilerOptions = parserServices.program.getCompilerOptions();
        if (compilerOptions.jsxFactory) {
          factories.add(compilerOptions.jsxFactory);
        }
        if (compilerOptions.jsxFragmentFactory) {
          factories.add(compilerOptions.jsxFragmentFactory);
        }
      }
      return factories;
    }

    const ruleListener = {
      ImportDeclaration: (node: estree.Node) => {
        const variables = context.getDeclaredVariables(node);
        for (const variable of variables) {
          if (!isExcluded(variable) && !isImplicitJsx(variable) && isUnused(variable)) {
            unusedImports.push({
              id: variable.identifiers[0],
              importDecl: node as estree.ImportDeclaration,
            });
          }
        }
      },
      'TSTypeReference > Identifier, TSClassImplements > Identifier, TSInterfaceHeritage > Identifier':
        (node: estree.Node) => {
          saveTypeIdentifier(node as estree.Identifier);
        },
      "TSQualifiedName[left.type = 'Identifier']": (node: estree.Node) => {
        saveTypeIdentifier((node as any as TSESTree.TSQualifiedName).left as estree.Identifier);
      },
      "TSInterfaceHeritage > MemberExpression[object.type = 'Identifier'], TSClassImplements > MemberExpression[object.type = 'Identifier']":
        (node: estree.Node) => {
          saveTypeIdentifier(
            (node as any as TSESTree.MemberExpression).object as estree.Identifier,
          );
        },
      'Program:exit': () => {
        const jsxFactories = getJsxFactories();
        const jsxIdentifiers = context
          .getSourceCode()
          .ast.tokens.filter(token => token.type === 'JSXIdentifier')
          .map(token => token.value);
        unusedImports
          .filter(
            ({ id: unused }) =>
              !jsxIdentifiers.includes(unused.name) &&
              !tsTypeIdentifiers.has(unused.name) &&
              !vueIdentifiers.has(unused.name) &&
              !jsxFactories.has(unused.name),
          )
          .forEach(unused =>
            context.report({
              messageId: 'removeUnusedImport',
              data: {
                symbol: unused.id.name,
              },
              node: unused.id,
              suggest: [getSuggestion(context, unused)],
            }),
          );
      },
    };

    // @ts-ignore
    if (context.parserServices.defineTemplateBodyVisitor) {
      return context.parserServices.defineTemplateBodyVisitor(
        {
          VElement: (node: AST.VElement) => {
            const { rawName } = node;
            if (startsWithUpper(rawName)) {
              vueIdentifiers.add(rawName);
            } else if (isKebabCase(rawName)) {
              vueIdentifiers.add(toPascalCase(rawName));
            }
          },
          Identifier: (node: AST.ESLintIdentifier) => {
            vueIdentifiers.add(node.name);
          },
        },
        ruleListener,
        { templateBodyTriggerSelector: 'Program' },
      );
    }

    return ruleListener;
  },
};

function startsWithUpper(str: string) {
  return str.charAt(0) === str.charAt(0).toUpperCase();
}

function isKebabCase(str: string) {
  return str.includes('-');
}

function toPascalCase(str: string) {
  return str
    .replace(/\w+/g, word => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .replace(/-/g, '');
}

function getSuggestion(
  context: Rule.RuleContext,
  { id, importDecl }: { id: estree.Identifier; importDecl: estree.ImportDeclaration },
): Rule.SuggestionReportDescriptor {
  const variables = context.getDeclaredVariables(importDecl);
  if (variables.length === 1) {
    return {
      messageId: 'suggestRemoveWholeStatement',
      fix: fixer => {
        return removeNodeWithLeadingWhitespaces(context, importDecl, fixer);
      },
    };
  }

  const specifiers = importDecl.specifiers;
  const unusedSpecifier = specifiers.find(specifier => specifier.local === id)!;
  const code = context.getSourceCode();
  let range: [number, number];

  switch (unusedSpecifier.type) {
    case 'ImportDefaultSpecifier':
      const tokenAfter = code.getTokenAfter(id)!;
      // default import is always first
      range = [id.range![0], code.getTokenAfter(tokenAfter)!.range![0]];
      break;

    case 'ImportNamespaceSpecifier':
      // namespace import is always second
      range = [code.getTokenBefore(unusedSpecifier)!.range![0], unusedSpecifier.range![1]];
      break;

    case 'ImportSpecifier':
      const simpleSpecifiers = specifiers.filter(specifier => specifier.type === 'ImportSpecifier');
      const index = simpleSpecifiers.findIndex(specifier => specifier === unusedSpecifier);
      if (simpleSpecifiers.length === 1) {
        range = [specifiers[0].range![1], code.getTokenAfter(unusedSpecifier)!.range![1]];
      } else if (index === 0) {
        range = [simpleSpecifiers[0].range![0], simpleSpecifiers[1].range![0]];
      } else {
        range = [simpleSpecifiers[index - 1].range![1], simpleSpecifiers[index].range![1]];
      }
  }

  return {
    messageId: 'suggestRemoveOneVariable',
    fix: fixer => {
      return fixer.removeRange(range);
    },
  };
}
