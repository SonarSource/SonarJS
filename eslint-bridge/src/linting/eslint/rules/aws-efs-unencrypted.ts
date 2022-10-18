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
import {
  getUniqueWriteUsage,
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isIdentifier,
  isLiteral,
  isStringLiteral,
  isUndefined,
} from './helpers';
import { AwsCdkTemplate } from './helpers/aws/cdk';

import estree from 'estree';

const messages = {
  FSEncryptionDisabled: 'Make sure that using unencrypted file systems is safe here.',
  CFSEncryptionDisabled: 'Make sure that using unencrypted file systems is safe here.',
  CFSEncryptionOmitted: 'Omitting "encrypted" disables EFS encryption. Make sure it is safe here.',
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

type LiteralValue = string | number | bigint | boolean | RegExp | null | undefined;
const OPTIONS_ARGUMENT_POSITION = 2;

function checkFSProperties(expr: estree.NewExpression, ctx: Rule.RuleContext) {
  if (unknownParameters(expr)) {
    return;
  }

  const props = getValueOfExpression(
    ctx,
    expr.arguments[OPTIONS_ARGUMENT_POSITION],
    'ObjectExpression',
  );
  if (props === undefined) {
    return;
  }

  const property = getProperty(ctx, props, 'encrypted');
  if (property === null) {
    return;
  }

  const propertyValue = getUniqueWriteUsageOrNode(ctx, property.value);
  if (isUndefined(propertyValue)) {
    return;
  }
  if (queryValue(ctx, propertyValue) === false) {
    ctx.report({ messageId: 'FSEncryptionDisabled', node: property.value });
  }
}

function checkCfnFSProperties(expr: estree.NewExpression, ctx: Rule.RuleContext) {
  for (const argument of expr.arguments) {
    if (argument.type === 'SpreadElement') {
      return;
    }
  }

  const props = getValueOfExpression(
    ctx,
    expr.arguments[OPTIONS_ARGUMENT_POSITION],
    'ObjectExpression',
  );
  if (props === undefined) {
    ctx.report({ messageId: 'CFSEncryptionOmitted', node: expr });
    return;
  }

  const property = getProperty(ctx, props, 'encrypted');
  if (property === null) {
    ctx.report({ messageId: 'CFSEncryptionOmitted', node: props });
    return;
  }

  const propertyValue = getUniqueWriteUsageOrNode(ctx, property.value);
  if (isUndefined(propertyValue)) {
    ctx.report({ messageId: 'CFSEncryptionOmitted', node: property.value });
    return;
  }

  if (queryValue(ctx, propertyValue) !== true) {
    ctx.report({ messageId: 'CFSEncryptionDisabled', node: property.value });
  }
}

function getProperty(
  ctx: Rule.RuleContext,
  expr: estree.ObjectExpression,
  key: string,
): estree.Property | null {
  for (let i = expr.properties.length - 1; i >= 0; i--) {
    const property = expr.properties[i];
    if (isProperty(property, key)) {
      return property;
    }
    if (property.type === 'SpreadElement') {
      const props = getValueOfExpression(ctx, property.argument, 'ObjectExpression');
      if (props !== undefined) {
        const prop = getProperty(ctx, props, key);
        if (prop !== null) {
          return prop;
        }
      }
    }
  }
  return null;
}

function isProperty(node: estree.Node, key: string): node is estree.Property {
  return (
    node.type === 'Property' &&
    (isIdentifier(node.key, key) || (isStringLiteral(node.key) && node.key.value === key))
  );
}

function queryValue(ctx: Rule.RuleContext, node: estree.Node): LiteralValue {
  if (isLiteral(node)) {
    return node.value;
  } else if (isIdentifier(node)) {
    const usage = getUniqueWriteUsage(ctx, node.name);
    if (!usage) {
      return null;
    }
    return queryValue(ctx, usage);
  }
  return null;
}

function unknownParameters(expr: estree.NewExpression) {
  for (const argument of expr.arguments) {
    if (argument.type === 'SpreadElement') {
      return true;
    }
  }
  return false;
}
