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
  getProperty,
  getUniqueWriteUsage,
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isIdentifier,
  isLiteral,
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

type Values = {
  invalid?: any[];
  valid?: any[];
};

const OPTIONS_ARGUMENT_POSITION = 2;

function checkFSProperties(expr: estree.NewExpression, ctx: Rule.RuleContext) {
  const argument = expr.arguments[OPTIONS_ARGUMENT_POSITION];
  const props = getValueOfExpression(ctx, argument, 'ObjectExpression');

  if (props === undefined) {
    return;
  }

  const property = getProperty(props, 'encrypted', ctx);
  if (!property) {
    return;
  }

  const propertyValue = getUniqueWriteUsageOrNode(ctx, property.value);
  if (isUndefined(propertyValue)) {
    return;
  }
  if (disallowedValue(ctx, propertyValue, { invalid: [false] })) {
    ctx.report({ messageId: 'FSEncryptionDisabled', node: property.value });
  }
}

function checkCfnFSProperties(expr: estree.NewExpression, ctx: Rule.RuleContext) {
  const argument = expr.arguments[OPTIONS_ARGUMENT_POSITION];
  const props = getValueOfExpression(ctx, argument, 'ObjectExpression');

  if (isIdentifier(argument) && !isUndefined(argument) && props === undefined) {
    return;
  }

  if (props === undefined) {
    ctx.report({ messageId: 'CFSEncryptionOmitted', node: expr.callee });
    return;
  }

  const property = getProperty(props, 'encrypted', ctx);

  if (property === null) {
    ctx.report({ messageId: 'CFSEncryptionOmitted', node: props });
  }

  if (!property) {
    return;
  }

  const propertyValue = getUniqueWriteUsageOrNode(ctx, property.value);
  if (isUndefined(propertyValue)) {
    ctx.report({ messageId: 'CFSEncryptionOmitted', node: property.value });
    return;
  }

  if (disallowedValue(ctx, propertyValue, { valid: [true] })) {
    ctx.report({ messageId: 'CFSEncryptionDisabled', node: property.value });
  }
}

function disallowedValue(ctx: Rule.RuleContext, node: estree.Node, values: Values): boolean {
  if (isLiteral(node)) {
    if (values.valid && !values.valid.includes(node.value)) {
      return true;
    }
    if (values.invalid && values.invalid.includes(node.value)) {
      return true;
    }
  } else if (isIdentifier(node)) {
    const usage = getUniqueWriteUsage(ctx, node.name);
    if (usage) {
      return disallowedValue(ctx, usage, values);
    }
  }
  return false;
}
