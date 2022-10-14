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
// https://sonarsource.github.io/rspec/#/rspec/S6332/javascript

import { Rule } from 'eslint';
import {AwsCdkTemplate, getUniqueWriteUsageOrNode, getValueOfExpression, isIdentifier, isUndefined} from './helpers';
import estree from 'estree';

const messages = {
  FSEncryptionDisabled: 'Make sure that using unencrypted file systems is safe here.',
  CFSEncryptionDisabled: 'Make sure that using unencrypted file systems is safe here.',
  CFSEncryptionOmitted: 'Omitting "encrypted" disables EFS encryption. Make sure it is safe here.'
};

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws_efs.FileSystem': checkFSProperties,
    'aws-cdk-lib.aws_efs.CfnFileSystem': checkCfnFSProperties,
  },
  {
    meta: {
      messages,
    },
  },
);

function checkFSProperties(expr: estree.NewExpression, ctx: Rule.RuleContext) {
  const props = getValueOfExpression(ctx, expr.arguments[2], 'ObjectExpression');
  if (props === undefined) {
    report(expr.callee);
    return;
  }

  const masterKey = getProperty(props, 'encrypted');
  if (masterKey === undefined) {
    report(props);
    return;
  }

  const masterKeyValue = getUniqueWriteUsageOrNode(ctx, masterKey.value);
  if (isUndefined(masterKeyValue)) {
    report(masterKey);
    return;
  }

  function report(node: estree.Node) {
    ctx.report({
      messageId: 'issue',
      node,
    });
  }
}

function checkCfnFSProperties(expr: estree.NewExpression, ctx: Rule.RuleContext) {
  const props = getValueOfExpression(ctx, expr.arguments[2], 'ObjectExpression');
  if (props === undefined) {
    return;
  }

  const masterKey = getProperty(props, 'encrypted');
  if (masterKey === undefined) {
    return;
  }

  const masterKeyValue = getUniqueWriteUsageOrNode(ctx, masterKey.value);
  if (isUndefined(masterKeyValue)) {
    return;
  }

  function report(node: estree.Node) {
    ctx.report({
      messageId: 'issue',
      node,
    });
  }
}

export function getProperty(
  expr: estree.ObjectExpression,
  key: string,
): estree.Property | undefined {
  return expr.properties.find(prop => prop.type === 'Property' && isIdentifier(prop.key, key)) as
    | estree.Property
    | undefined;
}
