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
// https://sonarsource.github.io/rspec/#/rspec/S6759/javascript

import { Rule } from 'eslint';
import { Function, Node, ReturnStatement } from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getTypeFromTreeNode,
  getUniqueWriteUsageOrNode,
  isRequiredParserServices,
  last,
  RequiredParserServices,
} from '../helpers/index.js';
import ts from 'typescript';
import { meta } from './meta.js';

/**
 * Stacks return statements per function.
 */
interface FunctionInfo {
  returns: ReturnStatement[];
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      readOnlyProps: 'Mark the props of the component as read-only.',
      readOnlyPropsFix: 'Mark the props as read-only',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    const functionInfo: FunctionInfo[] = [];
    return {
      ':function'() {
        functionInfo.push({ returns: [] });
      },
      ':function:exit'(node: Function) {
        /* Functional component */
        const info = functionInfo.pop();
        if (!info || !isFunctionalComponent(node, info)) {
          return;
        }

        /* Provides props */
        const [props] = node.params;
        if (!props) {
          return;
        }

        /* Includes type annotation */
        const { typeAnnotation } = props as TSESTree.Parameter & {
          typeAnnotation?: TSESTree.TSTypeAnnotation;
        };
        if (!typeAnnotation) {
          return;
        }

        /* Read-only props */
        if (!isReadOnly(props, services)) {
          context.report({
            node: props,
            messageId: 'readOnlyProps',
            suggest: [
              {
                messageId: 'readOnlyPropsFix',
                fix(fixer) {
                  const tpe = typeAnnotation.typeAnnotation as unknown as Node;
                  const oldText = context.sourceCode.getText(tpe);
                  const newText = `Readonly<${oldText}>`;
                  return fixer.replaceText(tpe, newText);
                },
              },
            ],
          });
        }
      },
      ReturnStatement(node: ReturnStatement) {
        last(functionInfo).returns.push(node);
      },
    };

    /**
     * A function is considered to be a React functional component if it
     * is a named function declaration with a starting uppercase letter,
     * it takes at most one parameter, and it returns some JSX value.
     */
    function isFunctionalComponent(node: Function, info: FunctionInfo) {
      /* Named function declaration */
      if (node.type !== 'FunctionDeclaration' || node.id === null) {
        return false;
      }

      /* Starts with uppercase */
      const name = node.id.name;
      if (!(name && /^[A-Z]/.test(name))) {
        return false;
      }

      /* At most one parameter (for props) */
      const paramCount = node.params.length;
      if (paramCount > 1) {
        return false;
      }

      /* Returns JSX value */
      const { returns } = info;
      for (const ret of returns) {
        if (!ret.argument) {
          continue;
        }

        const value = getUniqueWriteUsageOrNode(context, ret.argument);
        if (value.type.startsWith('JSX')) {
          return true;
        }
      }

      return false;
    }

    /**
     * A props type is considered to be read-only if the type annotation
     * is decorated with TypeScript utility type `Readonly` or if it refers
     * to a pure type declaration, i.e. where all its members are read-only.
     */
    function isReadOnly(props: Node, services: RequiredParserServices) {
      const tpe = getTypeFromTreeNode(props, services);

      /* Readonly utility type */
      const { aliasSymbol } = tpe;
      if (aliasSymbol?.escapedName === 'Readonly') {
        return true;
      }

      /* Resolve symbol definition */
      const symbol = tpe.getSymbol();
      if (!symbol?.declarations) {
        /* Kill the noise */
        return true;
      }

      /* Pure type declaration */
      const declarations = symbol.declarations;
      for (const decl of declarations) {
        if (ts.isInterfaceDeclaration(decl)) {
          const node = services.tsNodeToESTreeNodeMap.get(decl);
          if (node?.type === 'TSInterfaceDeclaration') {
            const {
              body: { body: members },
            } = node;
            if (members.every(m => m.type === 'TSPropertySignature' && m.readonly)) {
              return true;
            }
          }
        }

        if (ts.isTypeLiteralNode(decl)) {
          const node = services.tsNodeToESTreeNodeMap.get(decl);
          if (node?.type === 'TSTypeLiteral') {
            const { members } = node;
            if (members.every(m => m.type === 'TSPropertySignature' && m.readonly)) {
              return true;
            }
          }
        }
      }

      return false;
    }
  },
};
