/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S2077/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getValueOfExpression,
  report,
  toSecondaryLocation,
  IssueLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

// Dictionary with fully qualified names of functions and indices of their
// parameters to analyze for hardcoded credentials.
const secretSignatures: Record<string, [number]> = {
  'cookie-parser': [0],
  'cookie-parser.JSONCookie': [1],
  'cookie-parser.signedCookies': [1],
  'cookie-parser.signedCookie': [1],
  'crypto.X509Certificate.checkPrivateKey': [0],
  'crypto.createDiffieHellman.setPrivateKey': [0],
  'crypto.createECDH.setPrivateKey': [0],
  'crypto.createHmac': [1],
  'crypto.createSecretKey': [0],
  'crypto.createSign.sign': [0],
  'crypto.createVerify.verify': [0],
  'crypto.privateDecrypt': [0],
  'crypto.privateEncrypt': [0],
  'crypto.sign': [2],
  'crypto.verify': [2],
  'jose.SignJWT': [0],
  'jose.jwtVerify': [1],
  'jsonwebtoken.sign': [1],
  'jsonwebtoken.verify': [1],
  'ldapjs.createClient.bind': [1],
  'node-jose.JWK.asKey': [0],
  'superagent.auth': [0],
};

// Dictionary with fully qualified names of functions, argument index containing
// the options object, and property name(s) that hold the secret.
const secretObjectSignatures: Record<string, { argIndex: number; propertyName: string }> = {
  'express-session': { argIndex: 0, propertyName: 'secret' },
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {},
  }),

  create(context: Rule.RuleContext) {
    const hardcodedVariables = new Map<string, estree.Node>();

    function isHardcodedString(expr: estree.Expression): boolean {
      switch (expr.type) {
        case 'Literal':
          return typeof expr.value === 'string';
        case 'TemplateLiteral':
          return expr.expressions.length === 0;
        case 'Identifier':
          return hardcodedVariables.has(expr.name);
        default:
          return false;
      }
    }

    function getSecondaryLocations(expr: estree.Expression): IssueLocation[] {
      if (expr.type === 'Identifier' && hardcodedVariables.has(expr.name)) {
        const nodeName = hardcodedVariables.get(expr.name);
        if (nodeName) {
          return [toSecondaryLocation(nodeName, 'Hardcoded value assigned here')];
        }
      }
      return [];
    }

    function reportIssue(callExpression: estree.CallExpression, secretExpr: estree.Expression) {
      report(
        context,
        {
          message: 'Revoke and change this password, as it is compromised.',
          loc: callExpression.callee.loc as estree.SourceLocation,
        },
        getSecondaryLocations(secretExpr),
      );
    }

    function checkSecretArgument(callExpression: estree.CallExpression, fqn: string) {
      secretSignatures[fqn].forEach(index => {
        const arg = callExpression.arguments[index];
        if (arg && arg.type !== 'SpreadElement' && isHardcodedString(arg)) {
          reportIssue(callExpression, arg);
        }
      });
    }

    function checkSecretProperty(callExpression: estree.CallExpression, fqn: string) {
      const { argIndex, propertyName } = secretObjectSignatures[fqn];
      const arg = callExpression.arguments[argIndex];
      if (!arg) {
        return;
      }
      const objectExpr = getValueOfExpression(context, arg, 'ObjectExpression');
      if (!objectExpr) {
        return;
      }
      const secretProperty = getProperty(objectExpr, propertyName, context);
      if (!secretProperty) {
        return;
      }
      const secretValue = secretProperty.value as estree.Expression;
      if (isHardcodedString(secretValue)) {
        reportIssue(callExpression, secretValue);
      }
    }

    return {
      Program() {
        hardcodedVariables.clear();
      },

      VariableDeclarator(node: estree.VariableDeclarator) {
        if (node.id.type === 'Identifier' && node.init && isHardcodedString(node.init)) {
          hardcodedVariables.set(node.id.name, node.init);
        }
      },

      CallExpression(node: estree.CallExpression) {
        const fqn = getFullyQualifiedName(context, node);
        if (!fqn) {
          return;
        }
        if (node.arguments.length > 0 && fqn in secretSignatures) {
          checkSecretArgument(node, fqn);
        }
        if (fqn in secretObjectSignatures) {
          checkSecretProperty(node, fqn);
        }
      },
    };
  },
};
