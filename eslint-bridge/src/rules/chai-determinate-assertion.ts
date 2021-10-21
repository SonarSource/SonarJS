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
//sonarsource.github.io/rspec/#/rspec/S6092/javascript

import { Rule } from 'eslint';
import { Chai, isDotNotation, isIdentifier } from '../utils';
import * as estree from 'estree';

const message = 'Refactor this uncertain assertion; it can succeed for multiple reasons.';

type ChainElement = {
  identifier: estree.Identifier;
  arguments?: estree.Node[];
};

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    if (!Chai.isImported(context)) {
      return {};
    }
    return {
      ExpressionStatement: (node: estree.ExpressionStatement) => {
        const elements: ChainElement[] = retrieveAssertionChainElements(node.expression);

        if (
          elements.length > 1 &&
          (isIdentifier(elements[0].identifier, 'expect') ||
            getElementIndex(elements, 'should') >= 0)
        ) {
          checkNotThrow(context, elements);
          checkNotInclude(context, elements);
        }
      },
    };
  },
};

function checkNotThrow(context: Rule.RuleContext, elements: ChainElement[]) {
  const notIndex = getElementIndex(elements, 'not');
  const notElement = elements[notIndex];

  const throwIndex = getElementIndex(elements, 'throw');
  const throwElement = elements[throwIndex];

  if (
    notElement &&
    throwElement &&
    notIndex === throwIndex - 1 &&
    throwElement.arguments &&
    throwElement.arguments.length > 0
  ) {
    context.report({
      message,
      loc: locFromTwoNodes(notElement.identifier, throwElement.identifier),
    });
  }
}

function checkNotInclude(context: Rule.RuleContext, elements: ChainElement[]) {
  const notIndex = getElementIndex(elements, 'not');
  const notElement = elements[notIndex];

  const includeIndex = getElementIndex(elements, 'include');
  const includeElement = elements[includeIndex];

  if (
    notElement &&
    includeElement &&
    notIndex === includeIndex - 1 &&
    includeElement.arguments &&
    includeElement.arguments.length > 0 && includeElement.arguments[0].type === 'ObjectExpression'
  ) {
    context.report({
      message,
      loc: locFromTwoNodes(notElement.identifier, includeElement.identifier),
    });
  }
}

function retrieveAssertionChainElements(node: estree.Expression) {
  let currentNode: estree.Node = node;
  const result: ChainElement[] = [];
  let currentArguments: estree.Node[] | undefined = undefined;

  while (true) {
    if (isDotNotation(currentNode)) {
      result.push({ identifier: currentNode.property, arguments: currentArguments });
      currentNode = currentNode.object;
      currentArguments = undefined;
    } else if (currentNode.type === 'CallExpression') {
      currentArguments = currentNode.arguments;
      currentNode = currentNode.callee;
    } else if (isIdentifier(currentNode)) {
      result.push({ identifier: currentNode, arguments: currentArguments });
      return result.reverse();
    } else {
      return [];
    }
  }
}

function getElementIndex(elements: ChainElement[], name: string) {
  return elements.findIndex(element => isIdentifier(element.identifier, name));
}

function locFromTwoNodes(start: estree.Node, end: estree.Node) {
  return {
    start: start.loc!.start,
    end: end.loc!.end,
  };
}
