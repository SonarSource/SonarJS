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
// https://sonarsource.github.io/rspec/#/rspec/S6308/javascript

import { Rule } from 'eslint';
import { AwsCdkTemplate } from '../helpers/aws/cdk';
import { NewExpression, Node } from 'estree';
import { generateMeta, getFullyQualifiedName, isBooleanLiteral, isStringLiteral } from '../helpers';
import { getResultOfExpression } from '../helpers/result';
import rspecMeta from './meta.json';

const DOMAIN_PROPS_POSITION = 2;
const ENABLED_PROPERTY = 'enabled';
const OPEN_SEARCH = 'OpenSearch';
const ELASTIC_SEARCH = 'Elasticsearch';

interface DomainCheckerOptions {
  encryptionProperty: string;
  version: {
    valueType: 'ElasticsearchVersion' | 'EngineVersion' | 'string';
    property: string;
    defaultValue: typeof OPEN_SEARCH | typeof ELASTIC_SEARCH;
  };
}

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-opensearchservice.Domain': domainChecker({
      encryptionProperty: 'encryptionAtRest',
      version: {
        valueType: 'EngineVersion',
        property: 'version',
        defaultValue: OPEN_SEARCH,
      },
    }),
    'aws-cdk-lib.aws-opensearchservice.CfnDomain': domainChecker({
      encryptionProperty: 'encryptionAtRestOptions',
      version: {
        valueType: 'string',
        property: 'engineVersion',
        defaultValue: OPEN_SEARCH,
      },
    }),
    'aws-cdk-lib.aws-elasticsearch.Domain': domainChecker({
      encryptionProperty: 'encryptionAtRest',
      version: {
        valueType: 'ElasticsearchVersion',
        property: 'version',
        defaultValue: ELASTIC_SEARCH,
      },
    }),
    'aws-cdk-lib.aws-elasticsearch.CfnDomain': domainChecker({
      encryptionProperty: 'encryptionAtRestOptions',
      version: {
        valueType: 'string',
        property: 'elasticsearchVersion',
        defaultValue: ELASTIC_SEARCH,
      },
    }),
  },
  generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      encryptionDisabled: 'Make sure that using unencrypted {{search}} domains is safe here.',
      encryptionOmitted:
        'Omitting {{encryptionPropertyName}} causes encryption of data at rest to be ' +
        'disabled for this {{search}} domain. Make sure it is safe here.',
    },
  }),
);

function domainChecker(options: DomainCheckerOptions) {
  return (expr: NewExpression, ctx: Rule.RuleContext) => {
    const call = getResultOfExpression(ctx, expr);
    const argument = call.getArgument(DOMAIN_PROPS_POSITION);
    const encryption = argument.getProperty(options.encryptionProperty);
    const version = argument.getProperty(options.version.property);
    const isEnabled = encryption.getProperty(ENABLED_PROPERTY);
    const search = version.map(getSearchEngine) ?? options.version.defaultValue;

    if (isEnabled.isMissing) {
      ctx.report({
        messageId: 'encryptionOmitted',
        node: isEnabled.node,
        data: {
          encryptionPropertyName: options.encryptionProperty,
          search,
        },
      });
    } else if (isEnabled.isFound && isUnencrypted(isEnabled.node)) {
      ctx.report({
        messageId: 'encryptionDisabled',
        node: isEnabled.node,
        data: {
          search,
        },
      });
    }

    function isUnencrypted(node: Node) {
      return isBooleanLiteral(node) && !node.value;
    }

    function getSearchEngine(node: Node) {
      let version: string | null;

      if (options.version.valueType === 'string' && isStringLiteral(node)) {
        version = `${options.version.property}.${node.value}`;
      } else {
        version = getFullyQualifiedName(ctx, node);
      }

      for (const name of version?.toLowerCase().split('.').reverse() ?? []) {
        if (name.includes('opensearch')) {
          return OPEN_SEARCH;
        } else if (name.includes('elasticsearch')) {
          return ELASTIC_SEARCH;
        }
      }

      return null;
    }
  };
}
