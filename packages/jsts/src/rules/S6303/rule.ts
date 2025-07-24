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

import type estree from 'estree';
import { AwsCdkTemplate, normalizeFQN } from '../helpers/aws/cdk.js';
import * as meta from './generated-meta.js';

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
  generateMeta(meta, {
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
