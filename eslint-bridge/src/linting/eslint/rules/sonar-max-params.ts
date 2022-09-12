/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S107/javascript

import { Linter, Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { interceptReport, mergeRules } from './decorators/helpers';

const eslintMaxParams = new Linter().getRules().get('max-params')!;

export const rule: Rule.RuleModule = {
  meta: {
    messages: { ...eslintMaxParams.meta!.messages },
  },
  create(context: Rule.RuleContext) {
    /**
     * Decorates ESLint `max-params` to ignore TypeScript constructor when its parameters
     * are all parameter properties, e.g., `constructor(private a: any, public b: any) {}`.
     */
    const ruleDecoration: Rule.RuleModule = interceptReport(
      eslintMaxParams,
      function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
        if ('node' in descriptor) {
          const fun = descriptor.node as TSESTree.FunctionLike;
          if (!isException(fun)) {
            context.report(descriptor);
          }
        }

        function isException(fun: TSESTree.FunctionLike) {
          return fun.params.every(param => param.type === 'TSParameterProperty');
        }
      },
    );

    /**
     * Extends ESLint `max-params` to detect TypeScript function
     * declarations, e.g., `function f(p: any): any;`.
     */
    const ruleExtension: Rule.RuleModule = {
      meta: {
        messages: { ...ruleDecoration.meta!.messages },
      },
      create(context: Rule.RuleContext) {
        return {
          TSDeclareFunction: checkFunction,
          TSEmptyBodyFunctionExpression: checkFunction,
        };

        function checkFunction(node: estree.Node) {
          const fun = node as unknown as TSESTree.FunctionLike;
          const maxParams = context.options[0] as number;
          const numParams = fun.params.length;
          if (fun.params.length > maxParams) {
            context.report({
              messageId: 'exceed',
              loc: getFunctionLocationHeader(node),
              data: {
                name: getFunctionNameWithKind(fun),
                count: numParams.toString(),
                max: maxParams.toString(),
              },
            });
          }

          function getFunctionLocationHeader(node: estree.Node) {
            const sourceCode = context.getSourceCode();
            const headerStart = sourceCode.getFirstToken(node)!;
            const headerEnd = sourceCode.getFirstToken(node, token => token.value === '(')!;
            return {
              start: headerStart.loc.start,
              end: headerEnd.loc.start,
            };
          }

          function getFunctionNameWithKind(fun: TSESTree.FunctionLike) {
            let name: string | undefined;
            let kind = 'function';
            switch (fun.type) {
              case 'TSDeclareFunction':
                kind = 'Function declaration';
                if (fun.id) {
                  name = fun.id.name;
                }
                break;
              case 'TSEmptyBodyFunctionExpression':
                kind = 'Empty function';
                const parent = fun.parent;
                if (parent?.type === 'MethodDefinition' && parent.key.type === 'Identifier') {
                  name = parent.key.name;
                }
                break;
            }
            if (name) {
              return `${kind} '${name}'`;
            } else {
              return kind;
            }
          }
        }
      },
    };

    const decorationListeners: Rule.RuleListener = ruleDecoration.create(context);
    const extensionListeners: Rule.RuleListener = ruleExtension.create(context);

    return mergeRules(decorationListeners, extensionListeners);
  },
};
