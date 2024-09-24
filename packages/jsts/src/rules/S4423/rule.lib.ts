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
// https://sonarsource.github.io/rspec/#/rspec/S4423/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getFullyQualifiedName, getProperty, getValueOfExpression } from '../helpers/index.ts';

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
      AWSOpenElasticSearch:
        'Omitting "tlsSecurityPolicy" enables a deprecated version of TLS. Set it to enforce TLS 1.2 or above.',
    },
  },
  create(context: Rule.RuleContext) {
    function getValueOfProperty(
      objectExpression: estree.ObjectExpression | undefined,
      propertyName: string,
    ) {
      const unsafeProperty =
        objectExpression && getProperty(objectExpression, propertyName, context);
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

      const secureOptions = getProperty(options, 'secureOptions', context);
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
        getFullyQualifiedName(context, node.object) === 'constants' &&
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
        const fqn = getFullyQualifiedName(context, callExpression);
        // https://nodejs.org/api/https.html#https_https_get_options_callback
        if (fqn === 'https.request') {
          checkSslOptions(callExpression.arguments[0]);
          checkSslOptions(callExpression.arguments[1]);
        }
        // https://github.com/request/request#tlsssl-protocol
        if (fqn === 'request.get') {
          checkSslOptions(callExpression.arguments[0]);
        }
        // https://nodejs.org/api/tls.html#tls_tls_connect_options_callback
        if (fqn === 'tls.connect') {
          checkSslOptions(callExpression.arguments[0]);
          checkSslOptions(callExpression.arguments[1]);
          checkSslOptions(callExpression.arguments[2]);
        }
        // https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options
        if (fqn === 'tls.createSecureContext') {
          checkSslOptions(callExpression.arguments[0]);
        }
      },
    };
  },
};
