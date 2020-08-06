/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-5122

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfIdentifier,
  isRequireModule,
  isIdentifier,
  toEncodedMessage,
} from './utils';
import { isLiteral } from 'eslint-plugin-sonarjs/lib/utils/nodes';

const MESSAGE = `Make sure that enabling CORS is safe here.`;

const CORS_HEADER = 'Access-Control-Allow-Origin';

const EXPRESS_MODULE = 'express';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    let usingExpressFramework = false;
    // we implement naive "dataflow" analysis by keeping all identifiers initialized with insecure settings, which are
    // subsequently passed to the cors() call. We don't actually analyze real control-flow of the code.
    let corsCallArguments: estree.Identifier[] = [];
    const sensitiveCorsOptions = new Map<string, estree.Property>();

    function report(node: estree.Node, ...secondaryLocations: estree.Node[]) {
      const message = toEncodedMessage(MESSAGE, secondaryLocations);
      context.report({ message, node });
    }

    return {
      Program() {
        // init flag for each file
        usingExpressFramework = false;
      },

      'Program:exit'() {
        corsCallArguments
          .filter(arg => sensitiveCorsOptions.has(arg.name))
          .forEach(arg => report(sensitiveCorsOptions.get(arg.name)!, arg));
        corsCallArguments = [];
        sensitiveCorsOptions.clear();
      },

      ImportDeclaration(node: estree.Node) {
        const { source } = node as estree.ImportDeclaration;
        if (source.value === EXPRESS_MODULE) {
          usingExpressFramework = true;
        }
      },

      VariableDeclarator(node: estree.Node) {
        const decl = node as estree.VariableDeclarator;
        const corsOptions = isSensitiveCorsOptions(decl.init);
        if (decl.id.type === 'Identifier' && corsOptions) {
          sensitiveCorsOptions.set(decl.id.name, corsOptions);
        }
      },

      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee } = call;

        if (isRequireModule(call, EXPRESS_MODULE)) {
          usingExpressFramework = true;
          return;
        }

        if (usingExpressFramework && callee.type === 'Identifier') {
          const moduleName = getModuleNameOfIdentifier(callee, context);
          if (moduleName?.value === 'cors') {
            if (call.arguments.length === 0 || isSensitiveCorsOptions(call.arguments[0])) {
              report(node);
            }
            if (call.arguments[0]?.type === 'Identifier') {
              corsCallArguments.push(call.arguments[0]);
            }
          }
        }

        if (isSettingCorsHeader(call)) {
          report(call.callee);
        }
      },

      ObjectExpression(node: estree.Node) {
        const objExpr = node as estree.ObjectExpression;
        objExpr.properties
          .filter(p => p.type === 'Property' && isCorsHeader(p.key) && isAnyDomain(p.value))
          .forEach(p => report(p));
      },
    };
  },
};

function isCorsHeader(node: estree.Node) {
  return isLiteral(node) && node.value === CORS_HEADER;
}

function isAnyDomain(node: estree.Node) {
  return isLiteral(node) && node.value === '*';
}

function isSensitiveCorsOptions(node: estree.Node | undefined | null): estree.Property | undefined {
  if (node?.type === 'ObjectExpression') {
    return node.properties.find(
      p => p.type === 'Property' && isIdentifier(p.key, 'origin') && isAnyDomain(p.value),
    ) as estree.Property;
  }
  return undefined;
}

function isSettingCorsHeader(call: estree.CallExpression) {
  return isCorsHeader(call.arguments[0]) && isAnyDomain(call.arguments[1]);
}
