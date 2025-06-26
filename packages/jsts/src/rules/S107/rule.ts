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
// https://sonarsource.github.io/rspec/#/rspec/S107/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { getESLintCoreRule } from '../external/core.js';
import {
  generateMeta,
  getFullyQualifiedName,
  interceptReport,
  isFunctionCall,
  isIdentifier,
  mergeRules,
} from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';

const eslintMaxParams = getESLintCoreRule('max-params');

const DEFAULT_MAXIMUM_FUNCTION_PARAMETERS = 7;

const messages = { ...eslintMaxParams.meta?.messages };

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const decorationListeners: Rule.RuleListener = ruleDecoration.create(context);
    const extensionListeners: Rule.RuleListener = ruleExtension.create(context);

    return mergeRules(decorationListeners, extensionListeners);
  },
};

function getMax(options: FromSchema<typeof meta.schema>[0]) {
  if (options) {
    if (typeof options === 'number') {
      return options;
    } else if (typeof options.max === 'number') {
      return options.max;
    }
  }
  return DEFAULT_MAXIMUM_FUNCTION_PARAMETERS;
}
/**
 * Decorates ESLint `max-params` to ignore TypeScript constructor when its parameters
 * are all parameter properties, e.g., `constructor(private a: any, public b: any) {}`.
 */
const ruleDecoration: Rule.RuleModule = interceptReport(
  eslintMaxParams,
  function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
    const max = getMax(context.options[0]);
    if ('node' in descriptor) {
      const functionLike = descriptor.node as TSESTree.FunctionLike;
      if (!isException(functionLike)) {
        if ((descriptor.node as TSESTree.Node).type === 'TSFunctionType' && 'loc' in descriptor) {
          descriptor.loc = descriptor.node.loc;
        }
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
      TSEmptyBodyFunctionExpression: (functionLike: TSESTree.TSEmptyBodyFunctionExpression) => {
        const parent = functionLike.parent;
        let name = 'Empty function';
        if (parent?.type === 'MethodDefinition' && parent.key.type === 'Identifier') {
          name = `Empty function '${parent.key.name}'`;
        }
        const max = getMax(context.options[0]);
        const numParams = functionLike.params.length;
        if (numParams > max) {
          context.report({
            messageId: 'exceed',
            loc: getFunctionHeaderLocation(context, functionLike),
            data: {
              name,
              count: numParams.toString(),
              max: max.toString(),
            },
          });
        }
      },
    };
  },
};

function getFunctionHeaderLocation(context: Rule.RuleContext, functionLike: TSESTree.FunctionLike) {
  const sourceCode = context.sourceCode;
  const functionNode = (
    functionLike.type === 'TSEmptyBodyFunctionExpression' ? functionLike.parent! : functionLike
  ) as estree.Node;
  const headerStart = sourceCode.getFirstToken(functionNode)!;
  const headerEnd = sourceCode.getFirstToken(functionNode, token => token.value === '(')!;
  return {
    start: headerStart.loc.start,
    end: headerEnd.loc.start,
  };
}
