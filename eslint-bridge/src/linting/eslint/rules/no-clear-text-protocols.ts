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
// https://sonarsource.github.io/rspec/#/rspec/S5332/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { URL } from 'url';
import { mergeRules } from './decorators/helpers';
import {
  getValueOfExpression,
  getObjectExpressionProperty,
  getModuleNameOfNode,
  isCallToFQN,
  getParent,
  getProperty,
  getUniqueWriteUsageOrNode,
  isFalseLiteral,
  isUndefined,
  isDotNotation,
  isIdentifier,
} from './helpers';
import { AwsCdkTemplate } from './helpers/aws/cdk';
import { Identifier, MemberExpression } from 'estree';

const INSECURE_PROTOCOLS = ['http://', 'ftp://', 'telnet://'];
const LOOPBACK_PATTERN = /localhost|127(?:\.[0-9]+){0,2}\.[0-9]+$|\/\/(?:0*\:)*?:?0*1$/;
const EXCEPTION_FULL_HOSTS = [
  'www.w3.org',
  'xml.apache.org',
  'schemas.xmlsoap.org',
  'schemas.openxmlformats.org',
  'rdfs.org',
  'purl.org',
  'xmlns.com',
  'schemas.google.com',
  'a9.com',
  'ns.adobe.com',
  'ltsc.ieee.org',
  'docbook.org',
  'graphml.graphdrawing.org',
  'json-schema.org',
];
const EXCEPTION_TOP_HOSTS = [/(.*\.)?example\.com$/, /(.*\.)?example\.org$/, /(.*\.)?test\.com$/];

const TRANSIT_ENCRYPTION_ENABLED = 'transitEncryptionEnabled';
const ENCRYPTION = 'encryption';
const STREAM_ENCRYPTION = 'streamEncryption';

const networkProtocolsRule: Rule.RuleModule = {
  meta: {
    messages: {
      insecureProtocol: 'Using {{protocol}} protocol is insecure. Use {{alternative}} instead.',
    },
  },
  create(context: Rule.RuleContext) {
    function checkNodemailer(callExpression: estree.CallExpression) {
      const firstArg = callExpression.arguments.length > 0 ? callExpression.arguments[0] : null;
      if (!firstArg) {
        return;
      }

      const firstArgValue = getValueOfExpression(context, firstArg, 'ObjectExpression');

      const ses = getObjectExpressionProperty(firstArgValue, 'SES');
      if (ses && usesSesCommunication(ses)) {
        return;
      }

      const secure = getObjectExpressionProperty(firstArgValue, 'secure');
      if (secure && (secure.value.type !== 'Literal' || secure.value.raw !== 'false')) {
        return;
      }

      const requireTls = getObjectExpressionProperty(firstArgValue, 'requireTLS');
      if (requireTls && (requireTls.value.type !== 'Literal' || requireTls.value.raw !== 'false')) {
        return;
      }

      const port = getObjectExpressionProperty(firstArgValue, 'port');
      if (port && (port.value.type !== 'Literal' || port.value.raw === '465')) {
        return;
      }

      context.report({ node: callExpression.callee, ...getMessageAndData('http') });
    }

    function usesSesCommunication(sesProperty: estree.Property) {
      const configuration = getValueOfExpression(context, sesProperty.value, 'ObjectExpression');
      if (!configuration) {
        return false;
      }

      const ses = getValueOfExpression(
        context,
        getObjectExpressionProperty(configuration, 'ses')?.value,
        'NewExpression',
      );
      if (!ses || !isCallToFQN(context, ses, '@aws-sdk/client-ses', 'SES')) {
        return false;
      }

      const aws = getObjectExpressionProperty(configuration, 'aws');
      if (!aws || getModuleNameOfNode(context, aws.value)?.value !== '@aws-sdk/client-ses') {
        return false;
      }

      return true;
    }

    function checkCallToFtp(callExpression: estree.CallExpression) {
      if (
        callExpression.callee.type === 'MemberExpression' &&
        callExpression.callee.property.type === 'Identifier' &&
        callExpression.callee.property.name === 'connect'
      ) {
        const newExpression = getValueOfExpression(
          context,
          callExpression.callee.object,
          'NewExpression',
        );
        if (
          !!newExpression &&
          getModuleNameOfNode(context, newExpression.callee)?.value === 'ftp'
        ) {
          const firstArg = callExpression.arguments.length > 0 ? callExpression.arguments[0] : null;
          if (!firstArg) {
            return;
          }
          const firstArgValue = getValueOfExpression(context, firstArg, 'ObjectExpression');
          const secure = getObjectExpressionProperty(firstArgValue, 'secure');
          if (secure && secure.value.type === 'Literal' && secure.value.raw === 'false') {
            context.report({
              node: callExpression.callee,
              ...getMessageAndData('ftp'),
            });
          }
        }
      }
    }

    function checkCallToRequire(callExpression: estree.CallExpression) {
      if (callExpression.callee.type === 'Identifier' && callExpression.callee.name === 'require') {
        const firstArg = callExpression.arguments.length > 0 ? callExpression.arguments[0] : null;
        if (
          firstArg &&
          firstArg.type === 'Literal' &&
          typeof firstArg.value === 'string' &&
          firstArg.value === 'telnet-client'
        ) {
          context.report({
            node: firstArg,
            ...getMessageAndData('telnet'),
          });
        }
      }
    }

    function isExceptionUrl(value: string) {
      if (INSECURE_PROTOCOLS.includes(value)) {
        const parent = getParent(context);
        return !(parent?.type === 'BinaryExpression' && parent.operator === '+');
      }
      return hasExceptionHost(value);
    }

    function hasExceptionHost(value: string) {
      let url;

      try {
        url = new URL(value);
      } catch (err) {
        return false;
      }

      const host = url.hostname;
      return (
        host.length === 0 ||
        LOOPBACK_PATTERN.test(host) ||
        EXCEPTION_FULL_HOSTS.some(exception => exception === host) ||
        EXCEPTION_TOP_HOSTS.some(exception => exception.test(host))
      );
    }

    return {
      Literal: (node: estree.Node) => {
        const literal = node as estree.Literal;
        if (typeof literal.value === 'string') {
          const value = literal.value.trim().toLocaleLowerCase();
          const insecure = INSECURE_PROTOCOLS.find(protocol => value.startsWith(protocol));
          if (insecure && !isExceptionUrl(value)) {
            const protocol = insecure.substring(0, insecure.indexOf(':'));
            context.report({
              ...getMessageAndData(protocol),
              node,
            });
          }
        }
      },
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        if (isCallToFQN(context, callExpression, 'nodemailer', 'createTransport')) {
          checkNodemailer(callExpression);
        }
        checkCallToFtp(callExpression);
        checkCallToRequire(callExpression);
      },
      ImportDeclaration: (node: estree.Node) => {
        const importDeclaration = node as estree.ImportDeclaration;
        if (
          typeof importDeclaration.source.value === 'string' &&
          importDeclaration.source.value === 'telnet-client'
        ) {
          context.report({
            node: importDeclaration.source,
            ...getMessageAndData('telnet'),
          });
        }
      },
    };
  },
};

function getMessageAndData(protocol: string) {
  let alternative;
  switch (protocol) {
    case 'http':
      alternative = 'https';
      break;
    case 'ftp':
      alternative = 'sftp, scp or ftps';
      break;
    default:
      alternative = 'ssh';
  }
  return { messageId: 'insecureProtocol', data: { protocol, alternative } };
}

const awsElasticacheRule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws_elasticache.CfnReplicationGroup': checkGroup,
  },
  {
    meta: {
      messages: {
        replicationGroup: 'Make sure that disabling transit encryption is safe here.',
      },
    },
  },
);

function checkGroup(expr: estree.NewExpression, ctx: Rule.RuleContext) {
  const argument = expr.arguments[2];
  const props = getValueOfExpression(ctx, argument, 'ObjectExpression');

  if (isUnknown(argument, props)) {
    return;
  }

  if (props === undefined) {
    report(expr.callee);
    return;
  }

  const encrpytion = getProperty(props, TRANSIT_ENCRYPTION_ENABLED, ctx);
  if (encrpytion === null) {
    report(props);
  }

  if (!encrpytion) {
    return;
  }

  const encryptionValue = getUniqueWriteUsageOrNode(ctx, encrpytion.value);
  if (isFalseLiteral(encryptionValue)) {
    report(encrpytion.value);
    return;
  }

  function report(node: estree.Node) {
    ctx.report({
      messageId: 'replicationGroup',
      node,
    });
  }
}

const awsKinesisRule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws_kinesis.Stream': checkStream,
    'aws-cdk-lib.aws_kinesis.CfnStream': checkCfnStream,
  },
  {
    meta: {
      messages: {
        streamEncryptionDisabled: 'Make sure that disabling stream encryption is safe here.',
      },
    },
  },
);

function checkStream(expr: estree.NewExpression, ctx: Rule.RuleContext) {
  const argument = expr.arguments[2];
  if (argument == null || isUndefined(argument)) {
    return;
  }

  const props = getValueOfExpression(ctx, argument, 'ObjectExpression');

  if (isUnknown(argument, props)) {
    return;
  }

  if (props === undefined) {
    report(argument);
    return;
  }

  const encryption = getProperty(props, ENCRYPTION, ctx);
  if (!encryption) {
    return;
  }

  const encryptionValue = getUniqueWriteUsageOrNode(ctx, encryption.value);

  if (isUnencryptedStream(encryptionValue)) {
    report(encryption.value);
    return;
  }

  function isUnencryptedStream(node: estree.Node) {
    if (!isMemberIdentifier(node)) {
      return false;
    }
    const className =
      node.object.type === 'Identifier' ? node.object.name : node.object.property.name;
    const constantName = node.property.name;
    return className === 'StreamEncryption' && constantName == 'UNENCRYPTED';
  }

  function report(node: estree.Node) {
    ctx.report({
      messageId: 'streamEncryptionDisabled',
      node,
    });
  }
}

function checkCfnStream(expr: estree.NewExpression, ctx: Rule.RuleContext) {
  const argument = expr.arguments[2];
  const props = getValueOfExpression(ctx, argument, 'ObjectExpression');

  if (isUnknown(argument, props)) {
    return;
  }

  if (props === undefined) {
    report(expr.callee);
    return;
  }

  const streamEncryption = getProperty(props, STREAM_ENCRYPTION, ctx);
  if (streamEncryption === null) {
    report(props);
  } else if (streamEncryption != null && isUndefined(streamEncryption.value)) {
    report(streamEncryption.value);
  }

  function report(node: estree.Node) {
    ctx.report({
      messageId: 'streamEncryptionDisabled',
      node,
    });
  }
}

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      ...networkProtocolsRule.meta!.messages,
      ...awsElasticacheRule.meta!.messages,
      ...awsKinesisRule.meta!.messages,
    },
  },
  create(context: Rule.RuleContext) {
    return mergeRules(
      networkProtocolsRule.create(context),
      awsElasticacheRule.create(context),
      awsKinesisRule.create(context),
    );
  },
};

function isUnknown(node: estree.Node | undefined, value: estree.Node | undefined) {
  return node?.type === 'Identifier' && !isUndefined(node) && value === undefined;
}

type MemberIdentifier = MemberExpression & {
  object: Identifier | (MemberExpression & { property: Identifier });
  property: Identifier;
};

function isMemberIdentifier(node: estree.Node): node is MemberIdentifier {
  return isDotNotation(node) && (isIdentifier(node.object) || isDotNotation(node.object));
}
