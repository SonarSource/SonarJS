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
  getValueOfExpression,
  getFullyQualifiedName,
  isUndefined,
  getProperty,
  getUniqueWriteUsageOrNode,
  getVariableFromName,
  disallowedValue,
} from './helpers';
import { AwsCdkTemplate } from './helpers/aws/cdk';

const AWS_OPTIONS_ARGUMENT_POSITION = 2;

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws_cdk_lib.aws_apigateway.CfnDomainName': (node, context) =>
      checkAWSTLS(node, context, true, 'AWSApiGateway', agwCfnDomain),
    'aws_cdk_lib.aws_apigateway.DomainName': (node, context) =>
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
      ),
    'aws_cdk_lib.aws_elasticsearch.CfnDomain': (node, context) =>
      checkAWSTLS(node, context, true, 'AWSOpenElasticSearch', cfnDomain),
    'aws_cdk_lib.aws_opensearchservice.Domain': (node, context) =>
      checkAWSTLS(
        node,
        context,
        true,
        'AWSOpenElasticSearch',
        checkDomainTLS(
          'tlsSecurityPolicy',
          'aws_cdk_lib.aws_opensearchservice.TLSSecurityPolicy.TLS_1_2',
        ),
      ),
    'aws_cdk_lib.aws_opensearchservice.CfnDomain': (node, context) =>
      checkAWSTLS(node, context, true, 'AWSOpenElasticSearch', cfnDomain),
    'aws_cdk_lib.aws_elasticsearch.Domain': (node, context) =>
      checkAWSTLS(
        node,
        context,
        true,
        'AWSOpenElasticSearch',
        checkDomainTLS(
          'tlsSecurityPolicy',
          'aws_cdk_lib.aws_elasticsearch.TLSSecurityPolicy.TLS_1_2',
        ),
      ),
  },
  {
    meta: {
      messages: {
        enforceTLS12: 'Change this code to enforce TLS 1.2 or above.',
        AWSApiGateway: 'Change this code to enforce TLS 1.2 or above.',
        AWSOpenElasticSearch:
          'Omitting "tlsSecurityPolicy" enables a deprecated version of TLS. Set it to enforce TLS 1.2 or above. Change this code to enforce TLS 1.2 or above.',
      },
    },
  },
);

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
      ctx.report({ messageId: 'enforceTLS12', node: property.value });
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
    ctx.report({ messageId: 'enforceTLS12', node: tlsSecurityPolicyProperty.value });
  }
}

function isUnresolved(node: estree.Node | undefined, value: estree.Node | undefined | null) {
  return node?.type === 'Identifier' && !isUndefined(node) && value === undefined;
}
