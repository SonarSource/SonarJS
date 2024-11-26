/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4423/javascript

import type { Rule } from 'eslint';
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
