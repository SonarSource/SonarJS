/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S2817/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  getSymbolAtLocation,
  getTypeAsString,
  isIdentifier,
  isRequiredParserServices,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const OPEN_DATABASE = 'openDatabase';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      convertWebSQLUse: 'Convert this use of a Web SQL database to another technology.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const { callee } = callExpression;
        const symbol = getSymbolAtLocation(callee, services);
        if (!!symbol) {
          return;
        }
        if (isIdentifier(callee, OPEN_DATABASE)) {
          context.report({ node: callee, messageId: 'convertWebSQLUse' });
        }
        if (callee.type !== 'MemberExpression' || !isIdentifier(callee.property, OPEN_DATABASE)) {
          return;
        }
        const typeName = getTypeAsString(callee.object, services);
        if (/window/i.test(typeName) || /globalThis/i.test(typeName)) {
          context.report({ node: callee, messageId: 'convertWebSQLUse' });
        }
      },
    };
  },
};
