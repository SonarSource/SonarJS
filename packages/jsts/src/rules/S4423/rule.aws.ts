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
import { AwsCdkCheckArguments, AwsCdkTemplate } from '../helpers/aws/cdk.js';

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws_cdk_lib.aws_apigateway.CfnDomainName': AwsCdkCheckArguments(
      'AWSApiGateway',
      true,
      'securityPolicy',
      { primitives: { valid: ['TLS_1_2'] } },
    ),
    'aws_cdk_lib.aws_apigateway.DomainName': AwsCdkCheckArguments(
      'AWSApiGateway',
      false,
      'securityPolicy',
      { fqns: { valid: ['aws_cdk_lib.aws_apigateway.SecurityPolicy.TLS_1_2'] } },
    ),
    'aws_cdk_lib.aws_elasticsearch.CfnDomain': AwsCdkCheckArguments(
      ['AWSOpenElasticSearch', 'enforceTLS12'],
      true,
      ['domainEndpointOptions', 'tlsSecurityPolicy'],
      {
        primitives: { valid: ['Policy-Min-TLS-1-2-2019-07'] },
      },
    ),
    'aws_cdk_lib.aws_opensearchservice.Domain': AwsCdkCheckArguments(
      ['AWSOpenElasticSearch', 'enforceTLS12'],
      true,
      'tlsSecurityPolicy',
      {
        fqns: { valid: ['aws_cdk_lib.aws_opensearchservice.TLSSecurityPolicy.TLS_1_2'] },
      },
    ),
    'aws_cdk_lib.aws_opensearchservice.CfnDomain': AwsCdkCheckArguments(
      ['AWSOpenElasticSearch', 'enforceTLS12'],
      true,
      ['domainEndpointOptions', 'tlsSecurityPolicy'],
      {
        primitives: { valid: ['Policy-Min-TLS-1-2-2019-07'] },
      },
    ),
    'aws_cdk_lib.aws_elasticsearch.Domain': AwsCdkCheckArguments(
      ['AWSOpenElasticSearch', 'enforceTLS12'],
      true,
      'tlsSecurityPolicy',
      {
        fqns: { valid: ['aws_cdk_lib.aws_elasticsearch.TLSSecurityPolicy.TLS_1_2'] },
      },
    ),
  },
  {
    messages: {
      enforceTLS12: 'Change this code to enforce TLS 1.2 or above.',
      AWSApiGateway: 'Change this code to enforce TLS 1.2 or above.',
      AWSOpenElasticSearch:
        'Omitting "tlsSecurityPolicy" enables a deprecated version of TLS. Set it to enforce TLS 1.2 or above.',
    },
  },
);
