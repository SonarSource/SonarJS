/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4144

import type { TSESTree } from '@typescript-eslint/utils';
import {
  areEquivalent,
  generateMeta,
  getMainFunctionTokenLocation,
  report,
  RuleContext,
  toSecondaryLocation,
} from '../helpers/index.js';
import type { Rule } from 'eslint';
import type estree from 'estree';
import * as meta from './generated-meta.js';
import { FromSchema } from 'json-schema-to-ts';

const DEFAULT_MIN_LINES = 3;

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

const message =
  'Update this function so that its implementation is not identical to the one on line {{line}}.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      identicalFunctions: message,
    },
  }),
  create(context) {
    const functions: Array<{ function: FunctionNode; parent: TSESTree.Node | undefined }> = [];
    const minLines = (context.options as FromSchema<typeof meta.schema>)[0] ?? DEFAULT_MIN_LINES;

    return {
      FunctionDeclaration(node: estree.Node) {
        visitFunction(node as TSESTree.FunctionDeclaration);
      },
      'VariableDeclarator > FunctionExpression, MethodDefinition > FunctionExpression': (
        node: estree.Node,
      ) => {
        visitFunction(node as TSESTree.FunctionExpression);
      },
      'VariableDeclarator > ArrowFunctionExpression, MethodDefinition > ArrowFunctionExpression': (
        node: estree.Node,
      ) => {
        visitFunction(node as TSESTree.ArrowFunctionExpression);
      },

      'Program:exit'() {
        processFunctions();
      },
    };

    function visitFunction(node: FunctionNode) {
      if (isBigEnough(node.body as estree.Node)) {
        functions.push({ function: node, parent: node.parent });
      }
    }

    function processFunctions() {
      for (let i = 1; i < functions.length; i++) {
        const duplicatingFunction = functions[i].function;

        for (let j = 0; j < i; j++) {
          const originalFunction = functions[j].function;

          if (
            areEquivalent(duplicatingFunction.body, originalFunction.body, context.sourceCode) &&
            originalFunction.loc
          ) {
            const loc = getMainFunctionTokenLocation(
              duplicatingFunction,
              functions[i].parent,
              context as unknown as RuleContext,
            );
            const originalFunctionLoc = getMainFunctionTokenLocation(
              originalFunction,
              functions[j].parent,
              context as unknown as RuleContext,
            );
            const secondaryLocations = [
              toSecondaryLocation({ loc: originalFunctionLoc }, 'Original implementation'),
            ];
            report(
              context,
              {
                message,
                data: {
                  line: originalFunction.loc.start.line as any,
                },
                loc,
              },
              secondaryLocations,
            );
            break;
          }
        }
      }
    }

    function isBigEnough(node: estree.Node) {
      const tokens = context.sourceCode.getTokens(node);

      if (tokens.length > 0 && tokens[0].value === '{') {
        tokens.shift();
      }

      if (tokens.length > 0 && tokens[tokens.length - 1].value === '}') {
        tokens.pop();
      }

      if (tokens.length > 0) {
        const firstLine = tokens[0].loc.start.line;
        const lastLine = tokens[tokens.length - 1].loc.end.line;

        return lastLine - firstLine + 1 >= minLines;
      }

      return false;
    }
  },
};
