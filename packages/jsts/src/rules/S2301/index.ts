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
import { Rule } from 'eslint';
import {
  generateMeta,
  getTypeFromTreeNode,
  getVariableFromIdentifier,
  isBooleanType,
  isRequiredParserServices,
  report,
  toSecondaryLocation,
} from '../helpers';
import type { Node as ESTreeNode } from 'estree';
import NodeParentExtension = Rule.NodeParentExtension;
import { meta as rspecMeta } from './meta';

type Node = ESTreeNode & NodeParentExtension;

const message =
  'Provide multiple methods instead of using "{{parameterName}}" to determine which action to take.';

export const S2301: Rule.RuleModule = {
  meta: generateMeta(
    rspecMeta as Rule.RuleMetaData,
    {
      messages: {
        message,
      },
    },
    true,
  ),
  create: context => {
    const testNodes: Array<Node> = [];

    return {
      Identifier: node => {
        /**
         * A suspect identifier is an identifier that:
         * * is a direct or undirect child of a test node
         * * has been defined by a parameter of type boolean
         */
        const isAChildOf = (identifier: Node, node: Node): boolean => {
          if (identifier.parent === node) {
            return true;
          }

          if (identifier.parent === null) {
            return false;
          }

          return isAChildOf(identifier.parent, node);
        };

        const testNode = testNodes.find(testNode => {
          return testNode === node || isAChildOf(node, testNode);
        });

        if (testNode === undefined) {
          return;
        }

        const variable = getVariableFromIdentifier(node, context.getScope());

        if (variable) {
          const definition = variable.defs[variable.defs.length - 1];

          if (
            definition?.type === 'Parameter' &&
            isRequiredParserServices(context.parserServices)
          ) {
            const type = getTypeFromTreeNode(definition.name, context.parserServices);

            if (isBooleanType(type)) {
              report(
                context,
                {
                  message,
                  messageId: 'message',
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
      IfStatement: node => {
        testNodes.push(node.test as Node);
      },
      'IfStatement:exit': () => {
        testNodes.pop();
      },
    };
  },
};

export const rule = S2301;
