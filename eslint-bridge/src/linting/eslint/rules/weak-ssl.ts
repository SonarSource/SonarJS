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
// https://sonarsource.github.io/rspec/#/rspec/S4423/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfNode,
  isCallToFQN,
  getObjectExpressionProperty,
  getValueOfExpression, getFullyQualifiedName,
} from './helpers';

const SECURE_PROTOCOL_ALLOWED_VALUES = [
  'TLSv1_2_method',
  'TLSv1_2_client_method',
  'TLSv1_2_server_method',
  'TLS_method',
  'TLS_client_method',
  'TLS_server_method',
];

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      useMinimumTLS: "Change '{{option}}' to use at least TLS v1.2.",
      useSecureTLS: "Change '{{option}}' to allow only secure TLS versions.",
      AWSApiGateway: 'Change this code to enforce TLS 1.2 or above.',
      AWSOpenElasticSearch: 'Omitting "tlsSecurityPolicy" enables a deprecated version of TLS. Set it to enforce TLS 1.2 or above. Change this code to enforce TLS 1.2 or above.'
    },
  },
  create(context: Rule.RuleContext) {
    function getValueOfProperty(
      objectExpression: estree.ObjectExpression | undefined,
      propertyName: string,
    ) {
      const unsafeProperty = getObjectExpressionProperty(objectExpression, propertyName);
      if (unsafeProperty) {
        return getValueOfExpression(context, unsafeProperty.value, 'Literal');
      }
      return undefined;
    }

    function checkMinMaxVersion(propertyName: string, property: estree.Literal | undefined) {
      if (property && (property.value === 'TLSv1.1' || property.value === 'TLSv1')) {
        context.report({
          node: property,
          messageId: 'useMinimumTLS',
          data: {
            option: propertyName,
          },
        });
      }
    }

    function checkSslOptions(optionsNode: estree.Node | undefined) {
      const options = getValueOfExpression(context, optionsNode, 'ObjectExpression');
      const minVersion = getValueOfProperty(options, 'minVersion');
      const maxVersion = getValueOfProperty(options, 'maxVersion');
      checkMinMaxVersion('minVersion', minVersion);
      checkMinMaxVersion('maxVersion', maxVersion);

      const secureProtocol = getValueOfProperty(options, 'secureProtocol');
      const secureProtocolValue = secureProtocol?.value?.toString() ?? '';
      if (secureProtocol && !SECURE_PROTOCOL_ALLOWED_VALUES.includes(secureProtocolValue)) {
        context.report({
          node: secureProtocol,
          messageId: 'useMinimumTLS',
          data: {
            option: 'secureProtocol',
          },
        });
      }

      const secureOptions = getObjectExpressionProperty(options, 'secureOptions');
      if (secureOptions && !isValidSecureOptions(secureOptions.value)) {
        context.report({
          node: secureOptions,
          messageId: 'useSecureTLS',
          data: {
            option: 'secureOptions',
          },
        });
      }
    }

    function isValidSecureOptions(options: estree.Node) {
      const flags: string[] = [];
      collectIdentifiersFromBinary(options, flags);
      return (
        flags[0] === null ||
        (flags.includes('SSL_OP_NO_TLSv1') && flags.includes('SSL_OP_NO_TLSv1_1'))
      );
    }

    function collectIdentifiersFromBinary(node: estree.Node, acc: (string | null)[]) {
      if (node.type === 'BinaryExpression') {
        collectIdentifiersFromBinary(node.left, acc);
        collectIdentifiersFromBinary(node.right, acc);
      } else if (
        node.type === 'MemberExpression' &&
        getModuleNameOfNode(context, node.object)?.value === 'constants' &&
        node.property.type === 'Identifier'
      ) {
        acc.push(node.property.name);
      } else {
        // if part of expression is some complex node like function call, we set null on index 0
        acc[0] = null;
      }
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        // https://nodejs.org/api/https.html#https_https_get_options_callback
        if (isCallToFQN(context, callExpression, 'https', 'request')) {
          checkSslOptions(callExpression.arguments[0]);
          checkSslOptions(callExpression.arguments[1]);
        }
        // https://github.com/request/request#tlsssl-protocol
        if (isCallToFQN(context, callExpression, 'request', 'get')) {
          checkSslOptions(callExpression.arguments[0]);
        }
        // https://nodejs.org/api/tls.html#tls_tls_connect_options_callback
        if (isCallToFQN(context, callExpression, 'tls', 'connect')) {
          checkSslOptions(callExpression.arguments[0]);
          checkSslOptions(callExpression.arguments[1]);
          checkSslOptions(callExpression.arguments[2]);
        }
        // https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options
        if (isCallToFQN(context, callExpression, 'tls', 'createSecureContext')) {
          checkSslOptions(callExpression.arguments[0]);
        }
      },
      NewExpression(node: estree.NewExpression) {
        const OPTIONS_ARGUMENT_POSITION = 2;
        if (node.arguments.some((arg, index) => arg.type === 'SpreadElement' && index <= OPTIONS_ARGUMENT_POSITION)) {
          return;
        }
        const normalizedActualFQN = getFullyQualifiedName(context, node.callee)?.replace(/-/g, '_');
        let messageId: string | null = null;
        let failIfNoProps = false;
        switch (normalizedActualFQN) {
          case 'aws_cdk_lib.aws_apigateway.CfnDomainName':
            messageId = 'AWSApiGateway';
            break;
          case 'aws_cdk_lib.aws_apigateway.DomainName':
            messageId = 'AWSApiGateway';
            break;
          case 'aws_cdk_lib.aws_elasticsearch.CfnDomain':
            messageId = 'AWSOpenElasticSearch';
            break;
          case 'aws_cdk_lib.aws_elasticsearch.Domain':
            messageId = 'AWSOpenElasticSearch';
            break;
          case 'aws_cdk_lib.aws_opensearchservice.CfnDomain':
            messageId = 'AWSOpenElasticSearch';
            break;
          case 'aws_cdk_lib.aws_opensearchservice.Domain':
            messageId = 'AWSOpenElasticSearch';
            break;
        }
        if (messageId) {
          const props = getValueOfExpression(
            context,
            node.arguments[OPTIONS_ARGUMENT_POSITION],
            'ObjectExpression',
          );
          if (props === undefined) {
            context.report({ messageId: 'CFSEncryptionOmitted', node: node.callee });
            return;
          }
        }
      },
    };
  },
};
