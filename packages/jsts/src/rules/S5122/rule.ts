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
// https://sonarsource.github.io/rspec/#/rspec/S5122/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  findFirstMatchingLocalAncestor,
  getFullyQualifiedName,
  getProperty,
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isCallingMethod,
  isIdentifier,
  report,
  resolveFunction,
  toSecondaryLocation,
} from '../helpers';
import { TSESTree } from '@typescript-eslint/utils';
import { SONAR_RUNTIME } from '../../linter/parameters';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

const MESSAGE = `Make sure that enabling CORS is safe here.`;
const SECONDARY_MESSAGE = 'Sensitive configuration';
const ACCESS_CONTROL_ALLOW_ORIGIN = 'Access-Control-Allow-Origin';
const ROUTINE_METHODS = new Set([
  'all', // 'all' is a special method that matches any HTTP method
  'checkout',
  'copy',
  'delete',
  'get',
  'head',
  'lock',
  'merge',
  'mkactivity',
  'mkcol',
  'move',
  'm-search',
  'notify',
  'options',
  'patch',
  'post',
  'purge',
  'put',
  'report',
  'search',
  'subscribe',
  'trace',
  'unlock',
  'unsubscribe',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.CallExpression) {
        checkNodeHttp(context, node);
        checkExpressCors(context, node);
        checkExpressUserControlledOrigin(context, node);
      },
    };
  },
};

/**
 * Checks that the callback of http.createServer() does not set the 'Access-Control-Allow-Origin' header to '*'.
 */
function checkNodeHttp(context: Rule.RuleContext, node: estree.CallExpression) {
  // Check if the node is a call to the 'http.createServer' method
  const fqn = getFullyQualifiedName(context, node.callee);
  if (fqn !== 'http.createServer') {
    return;
  }

  // Check if the first argument is defined
  const arg0 = node.arguments[0];
  if (!arg0) {
    return;
  }

  // Check if the first argument is a callback function
  const callback = resolveFunction(context, arg0);
  if (!callback) {
    return;
  }

  // Check if the callback has a response parameter
  const resParameter = callback.params[1];
  if (!resParameter || !isIdentifier(resParameter)) {
    return;
  }

  // Retrieve the variable declaration of the response parameter
  const resVariable = context.sourceCode.scopeManager
    .getDeclaredVariables(callback)
    .find(v => v.name === resParameter.name);
  if (!resVariable) {
    return;
  }

  // Check if the response parameter is used to set the 'Access-Control-Allow-Origin' header
  const resUsages = resVariable.references;
  for (const resUsage of resUsages) {
    const identifier = resUsage.identifier as TSESTree.Identifier;

    // Find the first ancestor that is a call to the 'writeHead' method
    const writeHeadCall = identifier?.parent?.parent as estree.Node | undefined;
    if (
      !(writeHeadCall?.type === 'CallExpression' && isCallingMethod(writeHeadCall, 2, 'writeHead'))
    ) {
      continue;
    }

    // Check if the header argument of the 'writeHead' method is defined
    const headerValue = getValueOfExpression(
      context,
      writeHeadCall.arguments[1],
      'ObjectExpression',
    );
    if (!headerValue) {
      continue;
    }

    // Check if the header argument contains the 'Access-Control-Allow-Origin' property
    const accessProperty = getProperty(headerValue, ACCESS_CONTROL_ALLOW_ORIGIN, context);
    if (!accessProperty) {
      continue;
    }

    // Check if the 'Access-Control-Allow-Origin' property is set to '*'
    const accessValue = getValueOfExpression(context, accessProperty.value, 'Literal');
    if (accessValue?.value === '*') {
      report(
        context,
        {
          node: writeHeadCall.callee,
          message: MESSAGE,
        },
        [toSecondaryLocation(accessProperty, SECONDARY_MESSAGE)],
      );
    }
  }
}

/**
 * Checks that the callback of express.use() does not use cors() middleware with sensitive configuration.
 */
function checkExpressCors(context: Rule.RuleContext, node: estree.CallExpression) {
  // Check if the node is a call to the 'express.use' method
  const fqn = getFullyQualifiedName(context, node.callee);
  if (fqn !== 'express.use') {
    return;
  }

  // Check if the first argument is defined
  const argValue = getValueOfExpression(context, node.arguments[0], 'CallExpression');
  if (!argValue) {
    return;
  }

  // Check if the first argument is a call to the 'cors' method
  const argFqn = getFullyQualifiedName(context, argValue);
  if (argFqn !== 'cors') {
    return;
  }

  // Check if the call to the 'cors' method has an argument (default configuration is sensitive)
  const corsOptions = argValue.arguments[0];
  if (!corsOptions) {
    report(context, {
      node,
      message: MESSAGE,
    });
    return;
  }

  // Check if the argument of the 'cors' method is an object
  const corsOptionsValue = getValueOfExpression(context, corsOptions, 'ObjectExpression');
  if (!corsOptionsValue) {
    return;
  }

  // Check if the 'origin' property is defined  (default configuration is sensitive)
  const originProperty = getProperty(corsOptionsValue, 'origin', context);
  if (!originProperty) {
    report(
      context,
      {
        node: node.callee,
        message: MESSAGE,
      },
      [toSecondaryLocation(corsOptions, SECONDARY_MESSAGE)],
    );
    return;
  }

  // Check if the 'origin' property is set to '*'
  const originValue = getValueOfExpression(context, originProperty.value, 'Literal');
  if (originValue?.value === '*') {
    report(
      context,
      {
        node: node.callee,
        message: MESSAGE,
      },
      [toSecondaryLocation(originProperty, SECONDARY_MESSAGE)],
    );
  }
}

/**
 * Checks that the callback of express.<method>() does not set the 'Access-Control-Allow-Origin' header to '*'.
 */
function checkExpressUserControlledOrigin(context: Rule.RuleContext, node: estree.CallExpression) {
  // Check if the node is a call to an express routine method
  const fqn = getFullyQualifiedName(context, node.callee)?.split('.');
  if (!(fqn?.length === 2 && fqn[0] === 'express' && ROUTINE_METHODS.has(fqn[1]))) {
    return;
  }

  // Check if the second argument is defined
  const arg1 = node.arguments[1];
  if (!arg1) {
    return;
  }

  // Check if the second argument is a callback function
  const callback = resolveFunction(context, arg1);
  if (!callback) {
    return;
  }

  // Check if the callback has a request parameter
  const reqParameter = callback.params[0];
  if (!reqParameter || !isIdentifier(reqParameter)) {
    return;
  }

  // Check if the callback has a response parameter
  const resParameter = callback.params[1];
  if (!resParameter || !isIdentifier(resParameter)) {
    return;
  }

  // Retrieve the variable declaration of the response parameter
  const resVariable = context.sourceCode.scopeManager
    .getDeclaredVariables(callback)
    .find(v => v.name === resParameter.name);
  if (!resVariable) {
    return;
  }

  // Check if the response parameter is used to set the 'Access-Control-Allow-Origin' header
  const resUsages = resVariable.references;
  for (const resUsage of resUsages) {
    const identifier = resUsage.identifier as TSESTree.Identifier;

    // Find the first ancestor that is a call to the 'setHeader' method
    const setHeaderCall = identifier?.parent?.parent as estree.Node | undefined;
    if (
      !(setHeaderCall?.type === 'CallExpression' && isCallingMethod(setHeaderCall, 2, 'setHeader'))
    ) {
      continue;
    }

    // Check if the first argument of the 'setHeader' method is 'Access-Control-Allow-Origin'
    const headerName = getValueOfExpression(context, setHeaderCall.arguments[0], 'Literal');
    if (
      !headerName ||
      typeof headerName.value !== 'string' ||
      headerName.value.toLowerCase() !== ACCESS_CONTROL_ALLOW_ORIGIN.toLowerCase()
    ) {
      continue;
    }

    // Retrieve the value of the header argument
    const headerArg = setHeaderCall.arguments[1];
    const headerValue = getUniqueWriteUsageOrNode(context, headerArg);

    // Check if the header value is a user-controlled origin header
    switch (headerValue.type) {
      // Check if the header value is a call to the 'req.header' method with 'origin' as argument
      case 'CallExpression': {
        const callee = headerValue.callee;
        const calleeText = context.sourceCode.getText(callee);
        if (calleeText === `${reqParameter.name}.header`) {
          const originValue = getValueOfExpression(context, headerValue.arguments[0], 'Literal');
          if (
            typeof originValue?.value === 'string' &&
            originValue.value.toLowerCase() === 'origin' &&
            !isValidated(callback, headerArg)
          ) {
            report(
              context,
              {
                node: setHeaderCall.callee,
                message: MESSAGE,
              },
              [toSecondaryLocation(headerValue, SECONDARY_MESSAGE)],
            );
          }
        }
        break;
      }
      // Check if the header value is a member expression with 'req.headers.origin' as argument
      case 'MemberExpression': {
        const headerValueText = context.sourceCode.getText(headerValue);
        if (
          headerValueText === `${reqParameter.name}.headers.origin` &&
          !isValidated(callback, headerArg)
        ) {
          report(
            context,
            {
              node: setHeaderCall.callee,
              message: MESSAGE,
            },
            [toSecondaryLocation(headerValue, SECONDARY_MESSAGE)],
          );
        }
        break;
      }
    }
  }

  /**
   * Checks if the user-controlled origin header is validated in the callback through a comparison.
   */
  function isValidated(callback: estree.Function, header: estree.Node) {
    if (!isIdentifier(header)) {
      return false;
    }

    // Find the variable declaration of the header
    const headerVariable = context.sourceCode.scopeManager
      .acquire(callback)
      ?.variables.find(v => v.name === header.name);
    if (!headerVariable) {
      return false;
    }

    // Check if the header is compared in a binary expression
    const headerUsages = headerVariable.references;
    for (const headerUsage of headerUsages) {
      const identifier = headerUsage.identifier as TSESTree.Identifier;
      const validated = findFirstMatchingLocalAncestor(
        identifier,
        node =>
          node.type === 'BinaryExpression' && ['==', '!=', '===', '!=='].includes(node.operator),
      );
      if (validated) {
        return true;
      }
    }

    return false;
  }
}
