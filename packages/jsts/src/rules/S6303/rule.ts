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
// https://sonarsource.github.io/rspec/#/rspec/S6303/javascript

import type { Rule } from 'eslint';
import {
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isFalseLiteral,
  isUndefined,
} from '../helpers/index.js';

import estree from 'estree';
import { AwsCdkTemplate, normalizeFQN } from '../helpers/aws/cdk.js';
import { meta } from './meta.js';

const CfnDBCluster = 'CfnDBCluster';
const CfnDBInstance = 'CfnDBInstance';
const DatabaseCluster = 'DatabaseCluster';
const DatabaseClusterFromSnapshot = 'DatabaseClusterFromSnapshot';
const DatabaseInstance = 'DatabaseInstance';
const DatabaseInstanceReadReplica = 'DatabaseInstanceReadReplica';

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws_rds.CfnDBCluster': checkStorage(CfnDBCluster),
    'aws-cdk-lib.aws_rds.CfnDBInstance': checkStorage(CfnDBInstance),
    'aws-cdk-lib.aws_rds.DatabaseCluster': checkStorage(DatabaseCluster),
    'aws-cdk-lib.aws_rds.DatabaseClusterFromSnapshot': checkStorage(DatabaseClusterFromSnapshot),
    'aws-cdk-lib.aws_rds.DatabaseInstance': checkStorage(DatabaseInstance),
    'aws-cdk-lib.aws_rds.DatabaseInstanceReadReplica': checkStorage(DatabaseInstanceReadReplica),
  },
  generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      unsafe: 'Make sure that using unencrypted storage is safe here.',
      omitted: 'Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.',
    },
  }),
);

const PROPS_ARGUMENT_POSITION = 2;

function checkStorage(storage: string) {
  return (expr: estree.NewExpression, ctx: Rule.RuleContext) => {
    const argument = expr.arguments[PROPS_ARGUMENT_POSITION];

    const props = getValueOfExpression(ctx, argument, 'ObjectExpression');
    if (isUnresolved(argument, props)) {
      return;
    }

    if (props === undefined) {
      report(expr.callee, 'omitted');
      return;
    }

    if (isException(storage, props)) {
      return;
    }

    const propertyKey = getProperty(props, 'storageEncrypted', ctx);
    if (propertyKey === null) {
      report(props, 'omitted');
    }

    if (!propertyKey) {
      return;
    }

    const propertyValue = getUniqueWriteUsageOrNode(ctx, propertyKey.value);
    if (isFalseLiteral(propertyValue)) {
      report(propertyKey.value, 'unsafe');
      return;
    }

    function isUnresolved(node: estree.Node | undefined, value: estree.Node | undefined | null) {
      return node?.type === 'Identifier' && !isUndefined(node) && value === undefined;
    }

    function isException(storage: string, props: estree.ObjectExpression) {
      if (
        ![
          DatabaseCluster,
          DatabaseClusterFromSnapshot,
          DatabaseInstance,
          DatabaseInstanceReadReplica,
        ].includes(storage)
      ) {
        return false;
      }

      const exceptionKey = getProperty(props, 'storageEncryptionKey', ctx);
      if (exceptionKey == null) {
        return false;
      }

      const exceptionValue = getUniqueWriteUsageOrNode(ctx, exceptionKey.value);
      if (exceptionValue.type !== 'NewExpression') {
        return false;
      }

      const fqn = normalizeFQN(getFullyQualifiedName(ctx, exceptionValue.callee));
      return fqn === 'aws_cdk_lib.aws_kms.Key' || fqn === 'aws_cdk_lib.aws_kms.Alias';
    }

    function report(node: estree.Node, messageId: string) {
      ctx.report({
        messageId,
        node,
      });
    }
  };
}
