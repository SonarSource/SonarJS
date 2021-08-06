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
// https://jira.sonarsource.com/browse/RSPEC-1128

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { isRequiredParserServices } from '../utils';

const EXCLUDED_IMPORTS = ['React'];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const isJsxPragmaSet =
      context
        .getSourceCode()
        .getAllComments()
        .findIndex(comment => comment.value.includes('@jsx jsx')) > -1;
    const unusedImports: estree.Identifier[] = [];
    const tsTypeIdentifiers: Set<string> = new Set();
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

    return {
      ImportDeclaration: (node: estree.Node) => {
        const variables = context.getDeclaredVariables(node);
        for (const variable of variables) {
          if (!isExcluded(variable) && !isImplicitJsx(variable) && isUnused(variable)) {
            unusedImports.push(variable.identifiers[0]);
          }
        }
      },
      'TSTypeReference > Identifier, TSClassImplements > Identifier, TSInterfaceHeritage > Identifier': (
        node: estree.Node,
      ) => {
        saveTypeIdentifier(node as estree.Identifier);
      },
      "TSQualifiedName[left.type = 'Identifier']": (node: estree.Node) => {
        saveTypeIdentifier(((node as any) as TSESTree.TSQualifiedName).left as estree.Identifier);
      },
      "TSInterfaceHeritage > MemberExpression[object.type = 'Identifier'], TSClassImplements > MemberExpression[object.type = 'Identifier']": (
        node: estree.Node,
      ) => {
        saveTypeIdentifier(
          ((node as any) as TSESTree.MemberExpression).object as estree.Identifier,
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
            unused =>
              !jsxIdentifiers.includes(unused.name) &&
              !tsTypeIdentifiers.has(unused.name) &&
              !jsxFactories.has(unused.name),
          )
          .forEach(unused =>
            context.report({
              message: `Remove this unused import of '${unused.name}'.`,
              node: unused,
            }),
          );
      },
    };
  },
};
