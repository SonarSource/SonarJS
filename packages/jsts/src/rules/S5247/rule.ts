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
// https://sonarsource.github.io/rspec/#/rspec/S5247/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  isIdentifier,
  getValueOfExpression,
  isRequiredParserServices,
  resolveFromFunctionReference,
  checkSensitiveCall,
  toEncodedMessage,
  getFullyQualifiedName,
} from '../helpers';
import { SONAR_RUNTIME } from '../../linter/parameters';

const MESSAGE = 'Make sure disabling auto-escaping feature is safe here.';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;

    function isEmptySanitizerFunction(
      sanitizerFunction:
        | estree.FunctionExpression
        | estree.FunctionDeclaration
        | estree.ArrowFunctionExpression,
    ) {
      if (sanitizerFunction.params.length !== 1) {
        return false;
      }
      const firstParam = sanitizerFunction.params[0];
      if (firstParam.type !== 'Identifier') {
        return false;
      }
      const firstParamName = firstParam.name;
      if (sanitizerFunction.body.type !== 'BlockStatement') {
        return (
          sanitizerFunction.body.type === 'Identifier' &&
          sanitizerFunction.body.name === firstParamName
        );
      }
      const { body } = sanitizerFunction.body;
      if (body.length !== 1) {
        return false;
      }
      const onlyStatement = body[0];
      if (
        onlyStatement.type === 'ReturnStatement' &&
        onlyStatement.argument &&
        isIdentifier(onlyStatement.argument, firstParamName)
      ) {
        return true;
      }
      return false;
    }

    function isInvalidSanitizerFunction(node: estree.Node) {
      type AssignedFunction =
        | estree.FunctionDeclaration
        | estree.FunctionExpression
        | estree.ArrowFunctionExpression
        | undefined
        | null;
      let assignedFunction: AssignedFunction =
        getValueOfExpression(context, node, 'FunctionExpression') ??
        getValueOfExpression(context, node, 'ArrowFunctionExpression');
      if (!assignedFunction && node.type === 'Identifier' && isRequiredParserServices(services)) {
        assignedFunction = resolveFromFunctionReference(context, node);
      }
      if (!!assignedFunction) {
        return isEmptySanitizerFunction(assignedFunction);
      }
      return false;
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpression);
        if (fqn === 'handlebars.compile') {
          checkSensitiveCall(context, callExpression, 1, 'noEscape', true, MESSAGE);
        }
        if (fqn === 'marked.setOptions') {
          checkSensitiveCall(context, callExpression, 0, 'sanitize', false, MESSAGE);
        }
        if (fqn === 'markdown-it') {
          checkSensitiveCall(context, callExpression, 0, 'html', true, MESSAGE);
        }
      },
      NewExpression: (node: estree.Node) => {
        const newExpression = node as estree.NewExpression;
        if (getFullyQualifiedName(context, newExpression) === 'kramed.Renderer') {
          checkSensitiveCall(context, newExpression, 0, 'sanitize', false, MESSAGE);
        }
      },
      AssignmentExpression: (node: estree.Node) => {
        const assignmentExpression = node as estree.AssignmentExpression;
        const { left, right } = assignmentExpression;
        if (left.type !== 'MemberExpression') {
          return;
        }
        if (
          !(
            getFullyQualifiedName(context, left) === 'mustache.escape' ||
            (isMustacheIdentifier(left.object) && isIdentifier(left.property, 'escape'))
          )
        ) {
          return;
        }
        if (isInvalidSanitizerFunction(right)) {
          context.report({
            node: left,
            message: toEncodedMessage(MESSAGE),
          });
        }
      },
    };
  },
};

function isMustacheIdentifier(node: estree.Node) {
  return isIdentifier(node, 'Mustache');
}
