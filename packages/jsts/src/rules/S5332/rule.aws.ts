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
// https://sonarsource.github.io/rspec/#/rspec/S5332/javascript

import type { Rule } from 'eslint';
import { AwsCdkCheckArguments, AwsCdkTemplate } from '../helpers/aws/cdk.js';
import estree from 'estree';

const sensitivePorts = [80, 8080, 8000, 8008];

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws_elasticache.CfnReplicationGroup': AwsCdkCheckArguments(
      'replicationGroup',
      true,
      'transitEncryptionEnabled',
      { primitives: { invalid: [false] } },
    ),
    'aws-cdk-lib.aws_kinesis.Stream': AwsCdkCheckArguments(
      'streamEncryptionDisabled',
      false,
      'encryption',
      { fqns: { invalid: ['aws_cdk_lib.aws_kinesis.StreamEncryption.UNENCRYPTED'] } },
    ),
    'aws-cdk-lib.aws_kinesis.CfnStream': AwsCdkCheckArguments(
      'streamEncryptionDisabled',
      true,
      'streamEncryption',
    ),
    'aws-cdk-lib.aws_elasticloadbalancing.LoadBalancer': {
      callExpression: AwsCdkCheckArguments(
        'noSSLTLS',
        false,
        'externalProtocol',
        {
          fqns: {
            invalid: [
              'aws-cdk-lib.aws_elasticloadbalancing.LoadBalancingProtocol.TCP',
              'aws-cdk-lib.aws_elasticloadbalancing.LoadBalancingProtocol.HTTP',
            ],
          },
        },
        false,
        0,
      ),
      functionName: 'addListener',
      newExpression: AwsCdkCheckArguments('noSSLTLS', false, ['listeners', 'externalProtocol'], {
        fqns: {
          invalid: [
            'aws-cdk-lib.aws_elasticloadbalancing.LoadBalancingProtocol.TCP',
            'aws-cdk-lib.aws_elasticloadbalancing.LoadBalancingProtocol.HTTP',
          ],
        },
      }),
    },
    'aws-cdk-lib.aws_elasticloadbalancing.CfnLoadBalancer': AwsCdkCheckArguments(
      'noSSLTLS',
      false,
      ['listeners', 'protocol'],
      { primitives: { invalid: ['tcp', 'http'], case_insensitive: true } },
    ),
    'aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationLoadBalancer': {
      callExpression: httpOrSensitivePort(1),
      functionName: 'addListener',
    },
    'aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationListener': httpOrSensitivePort(2),
    'aws-cdk-lib.aws_elasticloadbalancingv2.NetworkLoadBalancer': {
      callExpression: (expr: estree.NewExpression, ctx: Rule.RuleContext) => {
        const httpProtocol = AwsCdkCheckArguments(
          'noSSLTLS',
          false,
          'protocol',
          {
            fqns: {
              invalid: [
                'aws-cdk-lib.aws_elasticloadbalancingv2.Protocol.HTTP',
                'aws-cdk-lib.aws_elasticloadbalancingv2.Protocol.TCP',
                'aws-cdk-lib.aws_elasticloadbalancingv2.Protocol.UDP',
                'aws-cdk-lib.aws_elasticloadbalancingv2.Protocol.TCP_UDP',
              ],
            },
          },
          true,
          1,
        );
        const node = httpProtocol(expr, ctx);
        if (node) {
          ctx.report({ messageId: 'noSSLTLS', node });
        } else {
          const missingProtocol = AwsCdkCheckArguments(
            'noSSLTLS',
            true,
            'protocol',
            undefined,
            true,
            1,
          );
          if (missingProtocol(expr, ctx)) {
            const certificatesChecker = AwsCdkCheckArguments(
              'noSSLTLS',
              true,
              'certificates',
              undefined,
              true,
              1,
            );
            const portNode = certificatesChecker(expr, ctx);
            if (portNode) {
              ctx.report({ messageId: 'noSSLTLS', node: portNode });
            }
          }
        }
      },
      functionName: 'addListener',
    },
    'aws-cdk-lib.aws_elasticloadbalancingv2.NetworkListener': (
      expr: estree.NewExpression,
      ctx: Rule.RuleContext,
    ) => {
      const httpProtocol = AwsCdkCheckArguments(
        'noSSLTLS',
        false,
        'protocol',
        {
          fqns: {
            invalid: [
              'aws-cdk-lib.aws_elasticloadbalancingv2.Protocol.TCP',
              'aws-cdk-lib.aws_elasticloadbalancingv2.Protocol.UDP',
              'aws-cdk-lib.aws_elasticloadbalancingv2.Protocol.TCP_UDP',
            ],
          },
        },
        true,
      );
      const node = httpProtocol(expr, ctx);
      if (node) {
        ctx.report({ messageId: 'noSSLTLS', node });
      } else {
        const missingProtocol = AwsCdkCheckArguments('noSSLTLS', true, 'protocol', undefined, true);
        if (missingProtocol(expr, ctx)) {
          const certificatesChecker = AwsCdkCheckArguments(
            'noSSLTLS',
            true,
            'certificates',
            undefined,
            true,
          );
          const portNode = certificatesChecker(expr, ctx);
          if (portNode) {
            ctx.report({ messageId: 'noSSLTLS', node: portNode });
          }
        }
      }
    },
    'aws-cdk-lib.aws_elasticloadbalancingv2.CfnListener': AwsCdkCheckArguments(
      'noSSLTLS',
      false,
      'protocol',
      { primitives: { invalid: ['HTTP', 'TCP', 'UDP', 'TCP_UDP'], case_insensitive: true } },
    ),
  },
  {
    messages: {
      replicationGroup: 'Make sure that disabling transit encryption is safe here.',
      noSSLTLS: 'Make sure that using network protocols without an SSL/TLS underlay is safe here.',
      streamEncryptionDisabled: 'Make sure that disabling stream encryption is safe here.',
    },
  },
);

function httpOrSensitivePort(position: number) {
  return function (expr: estree.NewExpression, ctx: Rule.RuleContext) {
    const httpProtocol = AwsCdkCheckArguments(
      'noSSLTLS',
      false,
      'protocol',
      { fqns: { invalid: ['aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationProtocol.HTTP'] } },
      true,
      position,
    );
    const node = httpProtocol(expr, ctx);
    if (node) {
      ctx.report({ messageId: 'noSSLTLS', node });
    } else {
      const missingProtocol = AwsCdkCheckArguments(
        'noSSLTLS',
        true,
        'protocol',
        undefined,
        true,
        position,
      );
      if (missingProtocol(expr, ctx)) {
        const portChecker = AwsCdkCheckArguments(
          'noSSLTLS',
          false,
          'port',
          { primitives: { invalid: sensitivePorts } },
          true,
          position,
        );
        const portNode = portChecker(expr, ctx);
        if (portNode) {
          ctx.report({ messageId: 'noSSLTLS', node: portNode });
        }
      }
    }
  };
}
