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
// https://sonarsource.github.io/rspec/#/rspec/S107/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { eslintRules } from '../core/index.js';
import {
  generateMeta,
  getFullyQualifiedName,
  interceptReport,
  isFunctionCall,
  isIdentifier,
  mergeRules,
} from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import { meta, schema } from './meta.js';

const eslintMaxParams = eslintRules['max-params'];

const DEFAULT_MAXIMUM_FUNCTION_PARAMETERS = 7;

const messages = { ...eslintMaxParams.meta?.messages };

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { messages, schema }),
  create(context: Rule.RuleContext) {
    const decorationListeners: Rule.RuleListener = ruleDecoration.create(context);
    const extensionListeners: Rule.RuleListener = ruleExtension.create(context);

    return mergeRules(decorationListeners, extensionListeners);
  },
};

/**
 * Decorates ESLint `max-params` to ignore TypeScript constructor when its parameters
 * are all parameter properties, e.g., `constructor(private a: any, public b: any) {}`.
 */
const ruleDecoration: Rule.RuleModule = interceptReport(
  eslintMaxParams,
  function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
    const max =
      (context.options as FromSchema<typeof schema>)[0]?.max ?? DEFAULT_MAXIMUM_FUNCTION_PARAMETERS;
    if ('node' in descriptor) {
      const functionLike = descriptor.node as TSESTree.FunctionLike;
      if (!isException(functionLike)) {
        context.report(descriptor);
      }
    }

    function isException(functionLike: TSESTree.FunctionLike) {
      return isBeyondMaxParams(functionLike) || isAngularConstructor(functionLike);
    }

    function isBeyondMaxParams(functionLike: TSESTree.FunctionLike) {
      return functionLike.params.filter(p => p.type !== 'TSParameterProperty').length <= max;
    }

    function isAngularConstructor(functionLike: TSESTree.FunctionLike) {
      /** A constructor is represented as MethodDefinition > FunctionExpression */
      const maybeConstructor = functionLike.parent;
      if (!isConstructor(maybeConstructor)) {
        return false;
      }

      /** A component is represented as ClassDeclaration > ClassBody */
      const maybeComponent = maybeConstructor.parent?.parent;
      if (!isAngularComponent(maybeComponent)) {
        return false;
      }

      return true;

      function isConstructor(node: TSESTree.Node | undefined): node is TSESTree.MethodDefinition {
        return (
          node?.type === 'MethodDefinition' && isIdentifier(node.key as estree.Node, 'constructor')
        );
      }

      function isAngularComponent(node: TSESTree.Node | undefined) {
        return (
          node?.type === 'ClassDeclaration' &&
          node.decorators?.some(decorator => {
            const node = decorator.expression as estree.Node;
            return (
              isFunctionCall(node) &&
              getFullyQualifiedName(context, node.callee) === '@angular.core.Component'
            );
          })
        );
      }
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
      const functionLike = node as unknown as TSESTree.FunctionLike;
      const max =
        (context.options as FromSchema<typeof schema>)[0]?.max ??
        DEFAULT_MAXIMUM_FUNCTION_PARAMETERS;
      const numParams = functionLike.params.length;
      if (numParams > max) {
        context.report({
          messageId: 'exceed',
          loc: getFunctionHeaderLocation(functionLike),
          data: {
            name: getFunctionNameWithKind(functionLike),
            count: numParams.toString(),
            max: max.toString(),
          },
        });
      }

      function getFunctionHeaderLocation(functionLike: TSESTree.FunctionLike) {
        const sourceCode = context.sourceCode;
        const functionNode = (
          functionLike.type === 'TSEmptyBodyFunctionExpression'
            ? functionLike.parent!
            : functionLike
        ) as estree.Node;
        const headerStart = sourceCode.getFirstToken(functionNode)!;
        const headerEnd = sourceCode.getFirstToken(functionNode, token => token.value === '(')!;
        return {
          start: headerStart.loc.start,
          end: headerEnd.loc.start,
        };
      }

      function getFunctionNameWithKind(functionLike: TSESTree.FunctionLike) {
        let name: string | undefined;
        let kind = 'function';
        switch (functionLike.type) {
          case 'TSDeclareFunction':
            kind = 'Function declaration';
            if (functionLike.id) {
              name = functionLike.id.name;
            }
            break;
          case 'TSEmptyBodyFunctionExpression': {
            kind = 'Empty function';
            const parent = functionLike.parent;
            if (parent?.type === 'MethodDefinition' && parent.key.type === 'Identifier') {
              name = parent.key.name;
            }
            break;
          }
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
