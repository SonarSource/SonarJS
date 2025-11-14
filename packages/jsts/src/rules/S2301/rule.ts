/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S2301/javascript

import type { Rule } from 'eslint';
import {
  generateMeta,
  getTypeFromTreeNode,
  getVariableFromIdentifier,
  hasParent,
  isBooleanType,
  isRequiredParserServices,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import type { ArrowFunctionExpression, BlockStatement, FunctionExpression, Node } from 'estree';
import * as meta from './generated-meta.js';
import { TSESTree } from '@typescript-eslint/utils';

const message =
  'Provide multiple methods instead of using "{{parameterName}}" to determine which action to take.';

/**
 * A suspect test node is a test node that is the only child of a function body
 */
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      message,
    },
  }),
  create: context => {
    if (!isRequiredParserServices(context.sourceCode.parserServices)) {
      return {};
    }

    const suspectTestNodes: Array<Node> = [];
    const suspectBodies: Array<Node> = [];
    const suspectReturnStatements: Array<Node> = [];

    const handleFunctionBody = (node: BlockStatement) => {
      const statements = node.body;

      if (statements.length === 1) {
        suspectBodies.push(statements[0] as Node);
      }
    };

    const isAChildOf = (identifier: Node, node: Node): boolean => {
      if (hasParent(identifier)) {
        if (identifier.parent === node) {
          return true;
        }
        return isAChildOf(identifier.parent, node);
      }
      return false;
    };

    return {
      FunctionDeclaration: node => {
        handleFunctionBody(node.body);
      },
      FunctionExpression: node => {
        if (isCallbackArgument(node)) {
          // Omit this function expression as it's provided as an anonymous lambda
          return;
        }
        handleFunctionBody(node.body);
      },
      ArrowFunctionExpression: node => {
        if (isCallbackArgument(node)) {
          // Omit this arrow function expression as it's provided as an anonymous lambda
          return;
        }
        if (node.body.type === 'BlockStatement') {
          handleFunctionBody(node.body);
        }
      },
      Identifier: node => {
        // An identifier is suspect if it is a direct or indirect child of a suspect node,
        // or if it is a suspect node itself
        const isSuspect = suspectTestNodes.some(testNode => {
          return testNode === node || isAChildOf(node, testNode);
        });

        if (!isSuspect) {
          return;
        }

        const variable = getVariableFromIdentifier(node, context.sourceCode.getScope(node));

        if (variable) {
          const definition = variable.defs.at(-1);

          if (definition?.type === 'Parameter') {
            const type = getTypeFromTreeNode(definition.name, context.sourceCode.parserServices);
            const definitionParent = (definition.name as TSESTree.Identifier).parent;

            if (isBooleanType(type) && definitionParent?.type !== 'Property') {
              report(
                context,
                {
                  message,
                  loc: node.loc!,
                  data: {
                    parameterName: variable.name,
                  },
                },
                [
                  toSecondaryLocation(
                    definition.name,
                    `Parameter "${variable.name}" was declared here`,
                  ),
                ],
              );
            }
          }
        }
      },
      ConditionalExpression: node => {
        /**
         * A conditional expression is suspect if it is the direct child of a suspect body or the direct child of a suspect return statement
         */
        const parent = node.parent;

        if (suspectBodies.includes(parent) || suspectReturnStatements.includes(parent)) {
          suspectTestNodes.push(node.test as Node);
        }
      },
      IfStatement: node => {
        if (suspectBodies.includes(node) && node.alternate) {
          suspectTestNodes.push(node.test as Node);
        }
      },
      'IfStatement:exit': node => {
        if (suspectBodies.includes(node) && node.alternate) {
          suspectTestNodes.pop();
        }
      },
      ReturnStatement: node => {
        if (suspectBodies.includes(node)) {
          suspectReturnStatements.push(node);
        }
      },
      'ReturnStatement:exit': node => {
        if (suspectBodies.includes(node)) {
          suspectReturnStatements.pop();
        }
      },
    };
  },
};

function isCallbackArgument(
  node: (ArrowFunctionExpression | FunctionExpression) & Rule.NodeParentExtension,
) {
  return node.parent.type === 'CallExpression' && node.parent.arguments.includes(node);
}
