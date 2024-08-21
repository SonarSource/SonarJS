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
import { generateMeta, getValueOfExpression, isIdentifier, isMemberExpression } from '../helpers';
import { FromSchema } from 'json-schema-to-ts';
import { meta, schema } from './meta';

const GEOLOCATION = 'geolocation';
const CAMERA = 'camera';
const MICROPHONE = 'microphone';
const NOTIFICATIONS = 'notifications';
const PERSISTENT_STORAGE = 'persistent-storage';

const supportedPermissions = [GEOLOCATION, CAMERA, MICROPHONE, NOTIFICATIONS, PERSISTENT_STORAGE];

const DEFAULT_PERMISSIONS = [GEOLOCATION];

const messages = {
  checkPermission: 'Make sure the use of the {{feature}} is necessary.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { messages, schema }),
  create(context: Rule.RuleContext) {
    const permissions =
      (context.options as FromSchema<typeof schema>)[0]?.permissions ?? DEFAULT_PERMISSIONS;
    return {
      'CallExpression[callee.type="MemberExpression"]'(node: estree.Node) {
        const call = node as estree.CallExpression;
        const callee = call.callee as estree.MemberExpression;
        if (
          isNavigatorMemberExpression(callee, 'permissions', 'query') &&
          call.arguments.length > 0
        ) {
          checkPermissions(context, call, permissions);
          return;
        }
        if (
          permissions.includes(GEOLOCATION) &&
          isNavigatorMemberExpression(callee, GEOLOCATION, 'watchPosition', 'getCurrentPosition')
        ) {
          context.report({
            messageId: 'checkPermission',
            data: {
              feature: GEOLOCATION,
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
          checkForCameraAndMicrophonePermissions(context, permissions, callee, firstArg);
          return;
        }
        if (
          permissions.includes(NOTIFICATIONS) &&
          isMemberExpression(callee, 'Notification', 'requestPermission')
        ) {
          context.report({
            messageId: 'checkPermission',
            data: {
              feature: NOTIFICATIONS,
            },
            node: callee,
          });
          return;
        }
        if (
          permissions.includes(PERSISTENT_STORAGE) &&
          isMemberExpression(callee.object, 'navigator', 'storage')
        ) {
          context.report({
            messageId: 'checkPermission',
            data: {
              feature: PERSISTENT_STORAGE,
            },
            node: callee,
          });
        }
      },
      NewExpression(node: estree.Node) {
        const { callee } = node as estree.NewExpression;
        if (permissions.includes(NOTIFICATIONS) && isIdentifier(callee, 'Notification')) {
          context.report({
            messageId: 'checkPermission',
            data: {
              feature: NOTIFICATIONS,
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
  permissions: string[],
  callee: estree.MemberExpression,
  firstArg: estree.ObjectExpression | undefined,
) {
  if (!firstArg) {
    return;
  }
  const shouldCheckAudio = permissions.includes('microphone');
  const shouldCheckVideo = permissions.includes(CAMERA);
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
        perms.push(CAMERA);
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

function checkPermissions(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  permissions: string[],
) {
  const firstArg = getValueOfExpression(context, call.arguments[0], 'ObjectExpression');
  if (firstArg?.type === 'ObjectExpression') {
    const nameProp = firstArg.properties.find(prop =>
      hasNamePropertyWithPermission(prop, context, permissions),
    );
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
  permissions: string[],
) {
  if (prop.type === 'Property' && isIdentifier(prop.key, 'name')) {
    const value = getValueOfExpression(context, prop.value, 'Literal');
    return (
      value &&
      typeof value.value === 'string' &&
      supportedPermissions.includes(value.value) &&
      permissions.includes(value.value)
    );
  }
  return false;
}
