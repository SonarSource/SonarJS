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
// https://sonarsource.github.io/rspec/#/rspec/S6321/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  AwsCdkCheckArguments,
  AwsCdkConsumer,
  AwsCdkTemplate,
  FullyQualifiedName,
  getLiteralValue,
  normalizeFQN,
} from '../helpers/aws/cdk';
import {
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isUndefined,
  isUnresolved,
  reduceToIdentifier,
} from '../helpers';
import { meta } from './meta';

const TYPES_WITH_CONNECTIONS = [
  'aws_cdk_lib.aws_docdb.DatabaseCluster.connections',
  'aws_cdk_lib.aws_lambdaPythonAlpha.PythonFunction.connections',
  'aws_cdk_lib.aws_batchAlpha.ComputeEnvironment.connections',
  'aws_cdk_lib.aws_efs.FileSystem.connections',
  'aws_cdk_lib.aws_lambdaGoAlpha.GoFunction.connections',
  'aws_cdk_lib.aws_ecs.ExternalService.connections',
  'aws_cdk_lib.aws_ecs.FargateService.connections',
  'aws_cdk_lib.aws_ecs.Cluster.connections',
  'aws_cdk_lib.aws_ecs.Ec2Service.connections',
  'aws_cdk_lib.aws_elasticsearch.Domain.connections',
  'aws_cdk_lib.aws_neptuneAlpha.DatabaseCluster.connections',
  'aws_cdk_lib.aws_eks.FargateCluster.connections',
  'aws_cdk_lib.aws_eks.Cluster.connections',
  'aws_cdk_lib.aws_codebuild.PipelineProject.connections',
  'aws_cdk_lib.aws_codebuild.Project.connections',
  'aws_cdk_lib.aws_rds.DatabaseInstance.connections',
  'aws_cdk_lib.aws_rds.DatabaseInstanceReadReplica.connections',
  'aws_cdk_lib.aws_rds.DatabaseCluster.connections',
  'aws_cdk_lib.aws_rds.ServerlessClusterFromSnapshot.connections',
  'aws_cdk_lib.aws_rds.DatabaseProxy.connections',
  'aws_cdk_lib.aws_rds.DatabaseInstanceFromSnapshot.connections',
  'aws_cdk_lib.aws_rds.ServerlessCluster.connections',
  'aws_cdk_lib.aws_rds.DatabaseClusterFromSnapshot.connections',
  'aws_cdk_lib.aws_lambdaNodejs.NodejsFunction.connections',
  'aws_cdk_lib.aws_fsx.LustreFileSystem.connections',
  'aws_cdk_lib.aws_ec2.BastionHostLinux.connections',
  'aws_cdk_lib.aws_ec2.ClientVpnEndpoint.connections',
  'aws_cdk_lib.aws_ec2.Instance.connections',
  'aws_cdk_lib.aws_ec2.LaunchTemplate.connections',
  'aws_cdk_lib.aws_ec2.SecurityGroup.connections',
  'aws_cdk_lib.aws_kinesisfirehoseAlpha.DeliveryStream.connections',
  'aws_cdk_lib.aws_stepfunctionsTasks.SageMakerCreateTrainingJob.connections',
  'aws_cdk_lib.aws_stepfunctionsTasks.SageMakerCreateModel.connections',
  'aws_cdk_lib.aws_stepfunctionsTasks.EcsRunTask.connections',
  'aws_cdk_lib.aws_redshiftAlpha.Cluster.connections',
  'aws_cdk_lib.aws_opensearchservice.Domain.connections',
  'aws_cdk_lib.aws_secretsmanager.HostedRotation.connections',
  'aws_cdk_lib.aws_mskAlpha.Cluster.connections',
  'aws_cdk_lib.triggers.TriggerFunction.connections',
  'aws_cdk_lib.aws_autoscaling.AutoScalingGroup.connections',
  'aws_cdk_lib.aws_syntheticsAlpha.Canary.connections',
  'aws_cdk_lib.aws_cloudfront.experimental.EdgeFunction.connections',
  'aws_cdk_lib.aws_lambda.Function.connections',
  'aws_cdk_lib.aws_lambda.DockerImageFunction.connections',
  'aws_cdk_lib.aws_lambda.SingletonFunction.connections',
  'aws_cdk_lib.aws_lambda.Alias.connections',
  'aws_cdk_lib.aws_lambda.Version.connections',
  'aws_cdk_lib.aws_ec2.Connections',
];

const badPorts: number[] = [22, 3389];
const badIpsV4: string[] = ['0.0.0.0/0'];
const badIpsV6: string[] = ['::/0'];
const badFQNProtocols: string[] = [
  'aws_cdk_lib.aws_ec2.Protocol.ALL',
  'aws_cdk_lib.aws_ec2.Protocol.TCP',
];
const badProtocols: string[] = ['6', 'tcp', 'TCP'];

const templateCallback: { [key: FullyQualifiedName]: AwsCdkConsumer } = {};
for (const type of TYPES_WITH_CONNECTIONS) {
  templateCallback[`${type}.allowFrom`] = { callExpression: checkAllowFrom };
  templateCallback[`${type}.allowFromAnyIpv4`] = { callExpression: checkAllowFromAnyIpv4 };
}

templateCallback['aws_cdk_lib.aws_ec2.Connections.allowDefaultPortFrom'] = {
  callExpression: (expr: estree.CallExpression, ctx: Rule.RuleContext) => {
    if (isBadEc2Peer(ctx, expr.arguments[0])) {
      checkConstructorDefaultPort(ctx, expr);
    }
  },
};
templateCallback['aws_cdk_lib.aws_ec2.Connections.allowDefaultPortFromAnyIpv4'] = {
  callExpression: (expr: estree.CallExpression, ctx: Rule.RuleContext) => {
    checkConstructorDefaultPort(ctx, expr);
  },
};
templateCallback['aws_cdk_lib.aws_ec2.SecurityGroup.addIngressRule'] = {
  callExpression: checkAllowFrom,
};

templateCallback['aws_cdk_lib.aws_ec2.CfnSecurityGroup'] = (
  expr: estree.NewExpression,
  ctx: Rule.RuleContext,
) => {
  const params = expr.arguments[2];
  const objExpr = getValueOfExpression(ctx, params, 'ObjectExpression', true);
  if (!objExpr) {
    return;
  }

  const ingressProp = getProperty(objExpr, 'securityGroupIngress', ctx);

  if (!ingressProp) {
    return;
  }

  const arrExpr = getValueOfExpression(ctx, ingressProp.value, 'ArrayExpression', true);

  if (arrExpr) {
    for (const ingressGroup of arrExpr.elements) {
      if (ingressGroup) {
        checkIngressObject(ctx, ingressGroup);
      }
    }
  }
};

templateCallback['aws_cdk_lib.aws_ec2.CfnSecurityGroupIngress'] = (
  expr: estree.NewExpression,
  ctx: Rule.RuleContext,
) => {
  checkIngressObject(ctx, expr.arguments[2]);
};

export const rule: Rule.RuleModule = AwsCdkTemplate(
  templateCallback,
  generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      allowFromAnyIpv4:
        'Change this method for "allowFrom" and set "other" to a subset of trusted IP addresses.',
      allowFrom: 'Change this IP range to a subset of trusted IP addresses.',
    },
  }),
);

const invalidDefaultPortChecker = AwsCdkCheckArguments(
  'allowFrom',
  false,
  'defaultPort',
  { customChecker: isBadEc2Port },
  true,
  0,
);

function checkConstructorDefaultPort(ctx: Rule.RuleContext, node: estree.CallExpression) {
  const newExpr = getValueOfExpression(ctx, reduceToIdentifier(node.callee), 'NewExpression', true);
  if (newExpr && invalidDefaultPortChecker(newExpr, ctx)) {
    ctx.report({ messageId: 'allowFromAnyIpv4', node: node.callee });
  }
}

function checkAllowFrom(expr: estree.CallExpression, ctx: Rule.RuleContext) {
  const badPeer = isBadEc2Peer(ctx, expr.arguments[0]);
  const badPort = isBadEc2Port(ctx, expr.arguments[1]);

  if (badPort && badPeer) {
    ctx.report({ messageId: 'allowFrom', node: expr.arguments[0] });
  }
}

function checkAllowFromAnyIpv4(expr: estree.CallExpression, ctx: Rule.RuleContext) {
  const badPort = isBadEc2Port(ctx, expr.arguments[0]);

  if (badPort) {
    ctx.report({ messageId: 'allowFromAnyIpv4', node: expr.callee });
  }
}

function checkIngressObject(ctx: Rule.RuleContext, node: estree.Node) {
  const objExpr = getValueOfExpression(ctx, node, 'ObjectExpression', true);
  if (!objExpr) {
    return;
  }

  const ipPropertyV4 = getPropertyValue(ctx, objExpr, 'cidrIp');
  const ipPropertyV6 = getPropertyValue(ctx, objExpr, 'cidrIpv6');

  const ipProtocol = getPropertyValue(ctx, objExpr, 'ipProtocol')?.value as string;
  const cidrIpV4 = ipPropertyV4?.value as string;
  const cidrIpV6 = ipPropertyV6?.value as string;
  const fromPort = Number.parseInt(getPropertyValue(ctx, objExpr, 'fromPort')?.value as string);
  const toPort = Number.parseInt(getPropertyValue(ctx, objExpr, 'toPort')?.value as string);

  if (
    disallowedIpV4(cidrIpV4) &&
    (ipProtocol === '-1' || (disallowedProtocol(ipProtocol) && disallowedPort(fromPort, toPort)))
  ) {
    ctx.report({ messageId: 'allowFrom', node: ipPropertyV4! });
  }

  if (
    disallowedIpV6(cidrIpV6) &&
    (ipProtocol === '-1' || (disallowedProtocol(ipProtocol) && disallowedPort(fromPort, toPort)))
  ) {
    ctx.report({ messageId: 'allowFrom', node: ipPropertyV6! });
  }
}

function disallowedPortObject(ctx: Rule.RuleContext, node: estree.Node) {
  const objExpr = getValueOfExpression(ctx, node, 'ObjectExpression', true);
  if (!objExpr) {
    return false;
  }
  const protocol = getProperty(objExpr, 'protocol', ctx);

  if (!protocol) {
    return false;
  }

  const protocolValue = getUniqueWriteUsageOrNode(ctx, protocol.value, true);

  if (isUnresolved(protocolValue, ctx) || isUndefined(protocolValue)) {
    return false;
  }
  const protocolFQN = normalizeFQN(getFullyQualifiedName(ctx, protocolValue));
  if (protocolFQN && badFQNProtocols.includes(protocolFQN)) {
    const fromPort = Number.parseInt(getPropertyValue(ctx, objExpr, 'fromPort')?.value as string);
    const toPort = Number.parseInt(getPropertyValue(ctx, objExpr, 'toPort')?.value as string);
    return disallowedPort(fromPort, toPort);
  }
  return false;
}

function isBadEc2Peer(ctx: Rule.RuleContext, node: estree.Node): boolean {
  const fqn = normalizeFQN(getFullyQualifiedName(ctx, node));
  if (fqn === 'aws_cdk_lib.aws_ec2.Peer.anyIpv4' || fqn === 'aws_cdk_lib.aws_ec2.Peer.anyIpv6') {
    return true;
  }
  if (fqn === 'aws_cdk_lib.aws_ec2.Peer.ipv4') {
    return disallowedIpV4(getArgumentValue(ctx, node)?.value as string);
  }
  if (fqn === 'aws_cdk_lib.aws_ec2.Peer.ipv6') {
    return disallowedIpV6(getArgumentValue(ctx, node)?.value as string);
  }
  return false;
}

function isBadEc2Port(ctx: Rule.RuleContext, node: estree.Node): boolean {
  const fqn = normalizeFQN(getFullyQualifiedName(ctx, node));
  if (fqn === 'aws_cdk_lib.aws_ec2.Port.allTcp' || fqn === 'aws_cdk_lib.aws_ec2.Port.allTraffic') {
    return true;
  }
  if (fqn === 'aws_cdk_lib.aws_ec2.Port.tcp') {
    return disallowedPort(getArgumentValue(ctx, node)?.value as number);
  }
  if (fqn === 'aws_cdk_lib.aws_ec2.Port.tcpRange') {
    const startRange = getArgumentValue(ctx, node)?.value as number;
    const endRange = getArgumentValue(ctx, node, 1)?.value as number;
    return disallowedPort(startRange, endRange);
  }
  if (fqn === 'aws_cdk_lib.aws_ec2.Port') {
    const portParams = getArgument(ctx, node);
    if (portParams) {
      return disallowedPortObject(ctx, portParams);
    }
  }
  return false;
}

function getArgument(
  ctx: Rule.RuleContext,
  node: estree.Node,
  position = 0,
): estree.Node | undefined {
  if (!node || isUndefined(node) || isUnresolved(node, ctx)) {
    return undefined;
  }

  const callExpr = getUniqueWriteUsageOrNode(ctx, node, true);

  if (
    isUnresolved(callExpr, ctx) ||
    isUndefined(callExpr) ||
    (callExpr.type !== 'CallExpression' && callExpr.type !== 'NewExpression')
  ) {
    return undefined;
  }

  const argument = callExpr.arguments[position];

  const argumentValue = getUniqueWriteUsageOrNode(ctx, argument, true);

  if (isUnresolved(argumentValue, ctx) || isUndefined(argumentValue)) {
    return undefined;
  }

  return argumentValue;
}

function getArgumentValue(
  ctx: Rule.RuleContext,
  node: estree.Node,
  position = 0,
): estree.Literal | undefined {
  const argument = getArgument(ctx, node, position);
  return argument ? getLiteralValue(ctx, argument) : undefined;
}

export function getPropertyValue(
  ctx: Rule.RuleContext,
  node: estree.ObjectExpression,
  propertyName: string,
): estree.Literal | undefined {
  const property = getProperty(node, propertyName, ctx);

  if (!property) {
    return undefined;
  }

  const propertyValue = getUniqueWriteUsageOrNode(ctx, property.value, true);

  if (isUnresolved(propertyValue, ctx) || isUndefined(propertyValue)) {
    return undefined;
  }

  return getLiteralValue(ctx, propertyValue);
}

function disallowedPort(startRange?: number, endRange?: number): boolean {
  if (startRange != null && endRange != null) {
    return badPorts.some(port => port >= startRange && port <= endRange);
  }
  if (startRange != null && endRange == null) {
    return badPorts.some(port => port === startRange);
  }
  return false;
}

function disallowedIpV4(ip?: string): boolean {
  return ip ? badIpsV4.includes(ip) : false;
}

function disallowedIpV6(ip?: string): boolean {
  return ip ? badIpsV6.includes(ip) : false;
}

function disallowedProtocol(protocol?: string): boolean {
  return protocol ? badProtocols.includes(protocol) : false;
}
