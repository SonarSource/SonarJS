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
// https://sonarsource.github.io/rspec/#/rspec/S5604/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isIdentifier, isMemberExpression, getValueOfExpression } from '../helpers';
import type { RuleModule } from '../../../../shared/src/types/rule';

const permissions = ['geolocation', 'camera', 'microphone', 'notifications', 'persistent-storage'];

export type Options = [
  {
    permissions: Array<string>;
  },
];

export const rule: RuleModule<Options> = {
  meta: {
    messages: {
      checkPermission: 'Make sure the use of the {{feature}} is necessary.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          permissions: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    ],
  },
  create(context: Rule.RuleContext) {
    return {
      'CallExpression[callee.type="MemberExpression"]'(node: estree.Node) {
        const call = node as estree.CallExpression;
        const callee = call.callee as estree.MemberExpression;
        if (
          isNavigatorMemberExpression(callee, 'permissions', 'query') &&
          call.arguments.length > 0
        ) {
          checkPermissions(context, call);
          return;
        }
        if (
          (context.options as Options)[0].permissions.includes('geolocation') &&
          isNavigatorMemberExpression(callee, 'geolocation', 'watchPosition', 'getCurrentPosition')
        ) {
          context.report({
            messageId: 'checkPermission',
            data: {
              feature: 'geolocation',
            },
            node: callee,
          });
          return;
        }
        if (
          isNavigatorMemberExpression(callee, 'mediaDevices', 'getUserMedia') &&
          call.arguments.length > 0
        ) {
          const firstArg = getValueOfExpression(context, call.arguments[0], 'ObjectExpression');
          checkForCameraAndMicrophonePermissions(context, callee, firstArg);
          return;
        }
        if (
          (context.options as Options)[0].permissions.includes('notifications') &&
          isMemberExpression(callee, 'Notification', 'requestPermission')
        ) {
          context.report({
            messageId: 'checkPermission',
            data: {
              feature: 'notifications',
            },
            node: callee,
          });
          return;
        }
        if (
          (context.options as Options)[0].permissions.includes('persistent-storage') &&
          isMemberExpression(callee.object, 'navigator', 'storage')
        ) {
          context.report({
            messageId: 'checkPermission',
            data: {
              feature: 'persistent-storage',
            },
            node: callee,
          });
        }
      },
      NewExpression(node: estree.Node) {
        const { callee } = node as estree.NewExpression;
        if (
          (context.options as Options)[0].permissions.includes('notifications') &&
          isIdentifier(callee, 'Notification')
        ) {
          context.report({
            messageId: 'checkPermission',
            data: {
              feature: 'notifications',
            },
            node: callee,
          });
        }
      },
    };
  },
};

function checkForCameraAndMicrophonePermissions(
  context: Rule.RuleContext,
  callee: estree.MemberExpression,
  firstArg: estree.ObjectExpression | undefined,
) {
  if (!firstArg) {
    return;
  }
  const shouldCheckAudio = (context.options as Options)[0].permissions.includes('microphone');
  const shouldCheckVideo = (context.options as Options)[0].permissions.includes('camera');
  if (!shouldCheckAudio && !shouldCheckVideo) {
    return;
  }
  const perms = [];
  for (const prop of firstArg.properties) {
    if (prop.type === 'Property') {
      const { value, key } = prop;
      if (isIdentifier(key, 'audio') && shouldCheckAudio && isOtherThanFalse(context, value)) {
        perms.push('microphone');
      } else if (
        isIdentifier(key, 'video') &&
        shouldCheckVideo &&
        isOtherThanFalse(context, value)
      ) {
        perms.push('camera');
      }
    }
  }
  if (perms.length > 0) {
    context.report({
      messageId: 'checkPermission',
      data: {
        feature: perms.join(' and '),
      },
      node: callee,
    });
  }
}

function isOtherThanFalse(context: Rule.RuleContext, value: estree.Node) {
  const exprValue = getValueOfExpression(context, value, 'Literal');
  if (exprValue && exprValue.value === false) {
    return false;
  }
  return true;
}

function checkPermissions(context: Rule.RuleContext, call: estree.CallExpression) {
  const firstArg = getValueOfExpression(context, call.arguments[0], 'ObjectExpression');
  if (firstArg?.type === 'ObjectExpression') {
    const nameProp = firstArg.properties.find(prop => hasNamePropertyWithPermission(prop, context));
    if (nameProp) {
      const { value } = (nameProp as estree.Property).value as estree.Literal;
      context.report({
        messageId: 'checkPermission',
        data: {
          feature: String(value),
        },
        node: nameProp,
      });
    }
  }
}

function isNavigatorMemberExpression(
  { object, property }: estree.MemberExpression,
  firstProperty: string,
  ...secondProperty: string[]
) {
  return (
    isMemberExpression(object, 'navigator', firstProperty) &&
    isIdentifier(property, ...secondProperty)
  );
}

function hasNamePropertyWithPermission(
  prop: estree.Property | estree.SpreadElement,
  context: Rule.RuleContext,
) {
  if (prop.type === 'Property' && isIdentifier(prop.key, 'name')) {
    const value = getValueOfExpression(context, prop.value, 'Literal');
    return (
      value &&
      typeof value.value === 'string' &&
      permissions.includes(value.value) &&
      (context.options as Options)[0].permissions.includes(value.value)
    );
  }
  return false;
}
