/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6329/javascript

import { AwsCdkCheckArguments, AwsCdkTemplate } from '../helpers/aws/cdk.js';
import type { Rule } from 'eslint';
import type { NewExpression, Node } from 'estree';
import { getResultOfExpression, Result } from '../helpers/result.js';
import { generateMeta, getFullyQualifiedName, isCallingMethod } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const PROPERTIES_POSITION = 2;

const PRIVATE_SUBNETS = new Set([
  'aws_cdk_lib.aws_ec2.SubnetType.PRIVATE_ISOLATED',
  'aws_cdk_lib.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS',
  'aws_cdk_lib.aws_ec2.SubnetType.PRIVATE_WITH_NAT',
]);

const PUBLIC_SUBNET = 'aws_cdk_lib.aws_ec2.SubnetType.PUBLIC';

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-ec2.Instance': AwsCdkCheckArguments(
      'publicNetwork',
      false,
      ['vpcSubnets', 'subnetType'],
      { fqns: { invalid: [PUBLIC_SUBNET] } },
    ),
    'aws-cdk-lib.aws-ec2.CfnInstance': checkCfnInstance,
    'aws-cdk-lib.aws_rds.DatabaseInstance': checkDatabaseInstance,
    'aws-cdk-lib.aws_rds.CfnDBInstance': AwsCdkCheckArguments(
      'publicNetwork',
      false,
      'publiclyAccessible',
      { primitives: { invalid: [true] } },
    ),
    'aws-cdk-lib.aws_dms.CfnReplicationInstance': AwsCdkCheckArguments(
      'publicNetwork',
      true,
      'publiclyAccessible',
      { primitives: { invalid: [true] } },
    ),
  },
  generateMeta(meta, {
    messages: {
      publicNetwork: 'Make sure allowing public network access is safe here.',
    },
  }),
);

function checkCfnInstance(expr: NewExpression, ctx: Rule.RuleContext) {
  const properties = getResultOfExpression(ctx, expr).getArgument(PROPERTIES_POSITION);
  const networkInterfaces = properties.getProperty('networkInterfaces');
  const sensitiveNetworkInterface = networkInterfaces.findInArray(result =>
    getSensitiveNetworkInterface(result, ctx),
  );

  if (sensitiveNetworkInterface.isFound) {
    ctx.report({
      messageId: 'publicNetwork',
      node: sensitiveNetworkInterface.node,
    });
  }
}

function getSensitiveNetworkInterface(networkInterface: Result, ctx: Rule.RuleContext) {
  const associatePublicIpAddress = networkInterface.getProperty('associatePublicIpAddress');
  if (associatePublicIpAddress.isTrue && !isFoundPrivateSubnet(networkInterface, ctx)) {
    return associatePublicIpAddress;
  } else {
    return null;
  }
}

function isFoundPrivateSubnet(networkInterface: Result, ctx: Rule.RuleContext) {
  const subnetId = networkInterface.getProperty('subnetId');
  const selectSubnetsCall = getSelectSubnetsCall(subnetId);
  const argument = selectSubnetsCall.getArgument(0);
  const subnetType = argument.getProperty('subnetType');
  return subnetType.isFound && isPrivateSubnet(subnetType.node, ctx);
}

function getSelectSubnetsCall(subnetId: Result) {
  let current = subnetId;
  while (current.ofType('MemberExpression')) {
    current = current.getMemberObject();
  }
  return current.filter(n => n.type === 'CallExpression' && isCallingMethod(n, 1, 'selectSubnets'));
}

function checkDatabaseInstance(expr: NewExpression, ctx: Rule.RuleContext) {
  const properties = getResultOfExpression(ctx, expr).getArgument(PROPERTIES_POSITION);
  const vpcSubnets = properties.getProperty('vpcSubnets');
  const subnetType = vpcSubnets.getProperty('subnetType');
  const publiclyAccessible = properties.getProperty('publiclyAccessible');

  if (subnetType.isFound && isPrivateSubnet(subnetType.node, ctx)) {
    return;
  }

  if (publiclyAccessible.isTrue && subnetType.isFound && isPublicSubnet(subnetType.node, ctx)) {
    ctx.report({
      messageId: 'publicNetwork',
      node: publiclyAccessible.node,
    });
  } else if (
    !publiclyAccessible.isFound &&
    subnetType.isFound &&
    isPublicSubnet(subnetType.node, ctx)
  ) {
    ctx.report({
      messageId: 'publicNetwork',
      node: subnetType.node,
    });
  }
}

function isPrivateSubnet(node: Node, ctx: Rule.RuleContext) {
  const subnet = getFullyQualifiedName(ctx, node)?.replaceAll('-', '_');
  return subnet !== undefined && PRIVATE_SUBNETS.has(subnet);
}

function isPublicSubnet(node: Node, ctx: Rule.RuleContext) {
  return PUBLIC_SUBNET === getFullyQualifiedName(ctx, node)?.replaceAll('-', '_');
}
