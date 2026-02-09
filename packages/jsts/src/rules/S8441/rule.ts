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
// https://sonarsource.github.io/rspec/#/rspec/S8441/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  Express,
  flattenArgs,
  generateMeta,
  getFullyQualifiedName,
  isMethodInvocation,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
// If a rule has a schema, use this to extract it.
// import { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';

const messages = {
  sessionSecondaryLocation: 'Session middleware declared here.',
  moveStaticBeforeSession: 'Move this static middleware before the session middleware.',
};

// Extend this list to support additional session-cookie middlewares.
const SESSION_MIDDLEWARES = ['express-session', 'cookie-session'];
const STATIC_MIDDLEWARES = ['express.static'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    let app: estree.Identifier | null = null;
    let lastSessionMiddleware: estree.Node | null = null;
    const scopeStack: Array<{
      app: estree.Identifier | null;
      lastSessionMiddleware: estree.Node | null;
    }> = [];

    function isMiddleware(context: Rule.RuleContext, node: estree.Node, names: string[]): boolean {
      if (node.type !== 'CallExpression') {
        return false;
      }
      const fqn = getFullyQualifiedName(context, node);
      return fqn !== null && names.includes(fqn);
    }

    return {
      Program() {
        app = null;
        lastSessionMiddleware = null;
        scopeStack.length = 0;
      },
      ':function'(node: estree.Node) {
        scopeStack.push({ app, lastSessionMiddleware });
        const injectedApp = Express.attemptFindAppInjection(node as estree.Function, context, node);
        if (injectedApp) {
          app = injectedApp;
          lastSessionMiddleware = null;
        }
      },
      ':function:exit'() {
        const previous = scopeStack.pop();
        if (previous) {
          app = previous.app;
          lastSessionMiddleware = previous.lastSessionMiddleware;
        }
      },
      VariableDeclarator(node: estree.Node) {
        const varDecl = node as estree.VariableDeclarator;
        const instantiatedApp = Express.attemptFindAppInstantiation(varDecl, context);
        if (instantiatedApp) {
          app = instantiatedApp;
          lastSessionMiddleware = null;
        }
      },
      CallExpression(node: estree.Node) {
        if (!app) {
          return;
        }
        const callExpr = node as estree.CallExpression;
        if (!isMethodInvocation(callExpr, app.name, 'use', 1)) {
          return;
        }

        const flattenedArgs = flattenArgs(context, callExpr.arguments);
        for (const middlewareNode of flattenedArgs) {
          if (isMiddleware(context, middlewareNode, SESSION_MIDDLEWARES)) {
            lastSessionMiddleware = middlewareNode;
            continue;
          }

          if (lastSessionMiddleware && isMiddleware(context, middlewareNode, STATIC_MIDDLEWARES)) {
            report(
              context,
              {
                node: middlewareNode,
                messageId: 'moveStaticBeforeSession',
                message: messages.moveStaticBeforeSession,
              },
              [toSecondaryLocation(lastSessionMiddleware, messages.sessionSecondaryLocation)],
            );
          }
        }
      },
    };
  },
};
