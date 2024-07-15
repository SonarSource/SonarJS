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
// https://sonarsource.github.io/rspec/#/rspec/S1541/javascript

import { AST, Rule } from 'eslint';
import * as estree from 'estree';
import {
  childrenOf,
  EncodedMessage,
  FunctionNodeType,
  generateMeta,
  getMainFunctionTokenLocation,
  getParent,
  isFunctionNode,
  IssueLocation,
  RuleContext,
  SONAR_RUNTIME,
} from '../helpers';
import { TSESTree } from '@typescript-eslint/utils';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { FromSchema } from 'json-schema-to-ts';
import rspecMeta from './meta.json';

const DEFAULT_THRESHOLD = 10;

const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 2,
  items: [
    {
      type: 'object',
      properties: {
        threshold: {
          type: 'integer',
        },
      },
      additionalProperties: false,
    },
    {
      type: 'string',
      // internal parameter for rules having secondary locations
      enum: [SONAR_RUNTIME],
    },
  ],
} as const satisfies JSONSchema4;

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, { schema }),
  create(context: Rule.RuleContext) {
    const threshold =
      (context.options as FromSchema<typeof schema>)[0]?.threshold ?? DEFAULT_THRESHOLD;
    let functionsWithParent: Map<estree.Node, estree.Node | undefined>;
    let functionsDefiningModule: estree.Node[];
    let functionsImmediatelyInvoked: estree.Node[];
    return {
      Program: () => {
        functionsWithParent = new Map<estree.Node, estree.Node>();
        functionsDefiningModule = [];
        functionsImmediatelyInvoked = [];
      },
      'Program:exit': () => {
        functionsWithParent.forEach((parent, func) => {
          if (
            !functionsDefiningModule.includes(func) &&
            !functionsImmediatelyInvoked.includes(func)
          ) {
            raiseOnUnauthorizedComplexity(func as FunctionNodeType, parent, threshold, context);
          }
        });
      },
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (node: estree.Node) =>
        functionsWithParent.set(node, getParent(context, node)),
      "CallExpression[callee.type='Identifier'][callee.name='define'] FunctionExpression": (
        node: estree.Node,
      ) => functionsDefiningModule.push(node),
      "NewExpression[callee.type='FunctionExpression'], CallExpression[callee.type='FunctionExpression']":
        (node: estree.Node) =>
          functionsImmediatelyInvoked.push((node as estree.NewExpression).callee),
    };
  },
};

function raiseOnUnauthorizedComplexity(
  node: FunctionNodeType,
  parent: estree.Node | undefined,
  threshold: number,
  context: Rule.RuleContext,
): void {
  const tokens = computeCyclomaticComplexity(node, parent, context);
  const complexity = tokens.length;
  if (complexity > threshold) {
    context.report({
      message: toEncodedMessage(complexity, threshold, tokens),
      loc: getMainFunctionTokenLocation(
        node as TSESTree.FunctionLike,
        parent as TSESTree.Node,
        context as unknown as RuleContext,
      ),
    });
  }
}

function toEncodedMessage(
  complexity: number,
  threshold: number,
  tokens: ComplexityToken[],
): string {
  const encodedMessage: EncodedMessage = {
    message: `Function has a complexity of ${complexity} which is greater than ${threshold} authorized.`,
    cost: complexity - threshold,
    secondaryLocations: tokens.map(node => toSecondaryLocation(node)),
  };
  return JSON.stringify(encodedMessage);
}

function toSecondaryLocation(token: ComplexityToken): IssueLocation {
  return {
    line: token.loc.start.line,
    column: token.loc.start.column,
    endLine: token.loc.end.line,
    endColumn: token.loc.end.column,
    message: '+1',
  };
}

function computeCyclomaticComplexity(
  node: estree.Node,
  parent: estree.Node | undefined,
  context: Rule.RuleContext,
): ComplexityToken[] {
  const visitor = new FunctionComplexityVisitor(node, parent, context);
  visitor.visit();
  return visitor.getComplexityTokens();
}

interface ComplexityToken {
  loc: AST.SourceLocation;
}

class FunctionComplexityVisitor {
  private readonly tokens: ComplexityToken[] = [];

  constructor(
    private readonly root: estree.Node,
    private readonly parent: estree.Node | undefined,
    private readonly context: Rule.RuleContext,
  ) {}

  visit() {
    const visitNode = (node: estree.Node) => {
      const { sourceCode } = this.context;
      let token: ComplexityToken | undefined | null;

      if (isFunctionNode(node)) {
        if (node !== this.root) {
          return;
        } else {
          token = {
            loc: getMainFunctionTokenLocation(
              node as TSESTree.FunctionLike,
              this.parent as TSESTree.Node,
              this.context as unknown as RuleContext,
            ),
          };
        }
      } else {
        switch (node.type) {
          case 'ConditionalExpression':
            token = sourceCode.getFirstTokenBetween(
              node.test,
              node.consequent,
              token => token.value === '?',
            );
            break;
          case 'SwitchCase':
            // ignore default case
            if (!node.test) {
              break;
            }
          case 'IfStatement':
          case 'ForStatement':
          case 'ForInStatement':
          case 'ForOfStatement':
          case 'WhileStatement':
          case 'DoWhileStatement':
            token = sourceCode.getFirstToken(node);
            break;
          case 'LogicalExpression':
            token = sourceCode.getTokenAfter(
              node.left,
              token => ['||', '&&'].includes(token.value) && token.type === 'Punctuator',
            );
            break;
        }
      }

      if (token) {
        this.tokens.push(token);
      }

      childrenOf(node, sourceCode.visitorKeys).forEach(visitNode);
    };

    visitNode(this.root);
  }

  getComplexityTokens() {
    return this.tokens;
  }
}
