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
  getValueOfExpression,
  getFullyQualifiedName,
  isIdentifier,
  isUndefined,
  getProperty,
  getUniqueWriteUsageOrNode,
  isLiteral,
  getUniqueWriteUsage,
  getVariableFromName,
} from './helpers';

const SECURE_PROTOCOL_ALLOWED_VALUES = [
  'TLSv1_2_method',
  'TLSv1_2_client_method',
  'TLSv1_2_server_method',
  'TLS_method',
  'TLS_client_method',
  'TLS_server_method',
];

const AWS_OPTIONS_ARGUMENT_POSITION = 2;

type Values = {
  invalid?: any[];
  valid?: any[];
};

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      useMinimumTLS: "Change '{{option}}' to use at least TLS v1.2.",
      useSecureTLS: "Change '{{option}}' to allow only secure TLS versions.",
      AWSApiGateway: 'Change this code to enforce TLS 1.2 or above.',
      AWSOpenElasticSearch:
        'Omitting "tlsSecurityPolicy" enables a deprecated version of TLS. Set it to enforce TLS 1.2 or above. Change this code to enforce TLS 1.2 or above.',
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
        if (
          node.arguments.some(
            (arg, index) => arg.type === 'SpreadElement' && index <= AWS_OPTIONS_ARGUMENT_POSITION,
          )
        ) {
          return;
        }
        const normalizedActualFQN = getFullyQualifiedName(context, node.callee)?.replace(/-/g, '_');
        switch (normalizedActualFQN) {
          case 'aws_cdk_lib.aws_apigateway.CfnDomainName':
            checkAWSTLS(node, context, true, 'AWSApiGateway', agwCfnDomain);
            break;
          case 'aws_cdk_lib.aws_apigateway.DomainName':
            checkAWSTLS(
              node,
              context,
              false,
              'AWSApiGateway',
              checkDomainTLS(
                'securityPolicy',
                'aws_cdk_lib.aws_apigateway.SecurityPolicy.TLS_1_2',
                false,
              ),
            );
            break;
          case 'aws_cdk_lib.aws_elasticsearch.CfnDomain':
            checkAWSTLS(node, context, true, 'AWSOpenElasticSearch', cfnDomain);
            break;
          case 'aws_cdk_lib.aws_elasticsearch.Domain':
            checkAWSTLS(
              node,
              context,
              true,
              'AWSOpenElasticSearch',
              checkDomainTLS(
                'tlsSecurityPolicy',
                'aws_cdk_lib.aws_elasticsearch.TLSSecurityPolicy.TLS_1_2',
              ),
            );
            break;
          case 'aws_cdk_lib.aws_opensearchservice.CfnDomain':
            checkAWSTLS(node, context, true, 'AWSOpenElasticSearch', cfnDomain);
            break;
          case 'aws_cdk_lib.aws_opensearchservice.Domain':
            checkAWSTLS(
              node,
              context,
              true,
              'AWSOpenElasticSearch',
              checkDomainTLS(
                'tlsSecurityPolicy',
                'aws_cdk_lib.aws_opensearchservice.TLSSecurityPolicy.TLS_1_2',
              ),
            );
            break;
        }
      },
    };
  },
};

function checkAWSTLS(
  node: estree.NewExpression,
  ctx: Rule.RuleContext,
  needsProps: boolean,
  messageId: string,
  checker: (
    expr: estree.ObjectExpression,
    ctx: Rule.RuleContext,
    messageId: string,
    nodeToReport: estree.Node,
  ) => void,
): void {
  const argument = node.arguments[AWS_OPTIONS_ARGUMENT_POSITION];
  const props = getValueOfExpression(ctx, argument, 'ObjectExpression');

  if (isUnresolved(argument, props)) {
    return;
  }

  if (props === undefined) {
    if (needsProps) {
      ctx.report({ messageId, node: node.callee });
    }
    return;
  }

  checker(props, ctx, messageId, argument);
}

function agwCfnDomain(
  expr: estree.ObjectExpression,
  ctx: Rule.RuleContext,
  messageId: string,
  nodeToReport: estree.Node,
) {
  const property = getProperty(expr, 'securityPolicy', ctx);

  if (property === null) {
    ctx.report({ messageId, node: nodeToReport });
  }

  if (!property) {
    return;
  }

  const propertyValue = getUniqueWriteUsageOrNode(ctx, property.value);
  if (isUndefined(propertyValue)) {
    ctx.report({ messageId, node: property.value });
    return;
  }

  if (disallowedValue(ctx, propertyValue, { valid: ['TLS_1_2'] })) {
    ctx.report({ messageId, node: property.value });
  }
}

function checkDomainTLS(propertyName: string, fqn: string, needsProp = true) {
  return (
    expr: estree.ObjectExpression,
    ctx: Rule.RuleContext,
    messageId: string,
    nodeToReport: estree.Node,
  ) => {
    const property = getProperty(expr, propertyName, ctx);

    if (property === null && needsProp) {
      ctx.report({ messageId, node: nodeToReport });
    }

    if (!property) {
      return;
    }

    const propertyValue = getUniqueWriteUsageOrNode(ctx, property.value);
    if (isUndefined(propertyValue)) {
      if (needsProp) {
        ctx.report({ messageId, node: property.value });
      }
      return;
    }
    const normalizedFQN = getFullyQualifiedName(ctx, propertyValue)?.replace(/-/g, '_');

    if (normalizedFQN !== fqn) {
      //check unresolved identifier before reporting
      if (!normalizedFQN && propertyValue.type === 'Identifier') {
        const variable = getVariableFromName(ctx, propertyValue.name);
        const writeReferences = variable?.references.filter(reference => reference.isWrite());
        if (!variable || !writeReferences?.length) {
          return;
        }
      }
      ctx.report({ messageId, node: property.value });
    }
  };
}

function cfnDomain(
  expr: estree.ObjectExpression,
  ctx: Rule.RuleContext,
  messageId: string,
  nodeToReport: estree.Node,
) {
  const domainEndpointOptionsProperty = getProperty(expr, 'domainEndpointOptions', ctx);

  if (domainEndpointOptionsProperty === null) {
    ctx.report({ messageId, node: nodeToReport });
  }

  if (!domainEndpointOptionsProperty) {
    return;
  }

  const domainEndpointOptions = getValueOfExpression(
    ctx,
    domainEndpointOptionsProperty.value,
    'ObjectExpression',
  );

  if (isUnresolved(domainEndpointOptionsProperty.value, domainEndpointOptions)) {
    return;
  }

  if (domainEndpointOptions === undefined) {
    ctx.report({ messageId, node: domainEndpointOptionsProperty.value });
    return;
  }

  const tlsSecurityPolicyProperty = getProperty(domainEndpointOptions, 'tlsSecurityPolicy', ctx);

  if (tlsSecurityPolicyProperty === null) {
    ctx.report({ messageId, node: nodeToReport });
  }

  if (!tlsSecurityPolicyProperty) {
    return;
  }

  const tlsSecurityPolicy = getUniqueWriteUsageOrNode(ctx, tlsSecurityPolicyProperty.value);
  if (isUndefined(tlsSecurityPolicy)) {
    ctx.report({ messageId, node: tlsSecurityPolicyProperty.value });
    return;
  }

  if (disallowedValue(ctx, tlsSecurityPolicy, { valid: ['Policy-Min-TLS-1-2-2019-07'] })) {
    ctx.report({ messageId, node: tlsSecurityPolicyProperty.value });
  }
}

function disallowedValue(ctx: Rule.RuleContext, node: estree.Node, values: Values): boolean {
  if (isLiteral(node)) {
    if (values.valid && !values.valid.includes(node.value)) {
      return true;
    }
    if (values.invalid && values.invalid.includes(node.value)) {
      return true;
    }
  } else if (isIdentifier(node)) {
    const usage = getUniqueWriteUsage(ctx, node.name);
    if (usage) {
      return disallowedValue(ctx, usage, values);
    }
  }
  return false;
}

function isUnresolved(node: estree.Node | undefined, value: estree.Node | undefined | null) {
  return node?.type === 'Identifier' && !isUndefined(node) && value === undefined;
}
