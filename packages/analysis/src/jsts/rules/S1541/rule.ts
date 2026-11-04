/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1541/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { FromSchema } from 'json-schema-to-ts';
import { type FunctionNodeType } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { ComplexityTracker } from './complexity.js';
import {
  getImmediatelyConstructedFunction,
  getImmediatelyInvokedFunction,
} from './immediate-invocation.js';
import { ModuleInitializerTracker } from './module-initializers.js';
import { hasRuntimeBinding } from './helpers.js';
import * as meta from './generated-meta.js';

const DEFAULT_THRESHOLD = 10;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const threshold =
      (context.options as FromSchema<typeof meta.schema>)[0]?.threshold ?? DEFAULT_THRESHOLD;
    const complexity = new ComplexityTracker(context);
    const moduleInitializers = new ModuleInitializerTracker((node, name) =>
      hasRuntimeBinding(context, node, name),
    );
    const immediatelyExecuted = new Set<estree.Node>();

    function excludeIfExecuted(functionNode: estree.Node | undefined) {
      if (functionNode) {
        immediatelyExecuted.add(functionNode);
      }
    }

    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (node: estree.Node) =>
        complexity.enterFunction(node as FunctionNodeType),
      ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression):exit': () =>
        complexity.leaveFunction(),
      'ConditionalExpression, LogicalExpression, SwitchCase, IfStatement, ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement':
        (node: estree.Node) => complexity.addBranch(node),

      // File-wide writes can invalidate a loader exception after its call.
      AssignmentExpression: (node: estree.Node) =>
        moduleInitializers.recordWrite((node as estree.AssignmentExpression).left),
      UpdateExpression: (node: estree.Node) =>
        moduleInitializers.recordWrite((node as estree.UpdateExpression).argument),
      UnaryExpression: (node: estree.Node) => {
        const unary = node as estree.UnaryExpression;
        if (unary.operator === 'delete') {
          moduleInitializers.recordWrite(unary.argument);
        }
      },
      'ForInStatement, ForOfStatement': (node: estree.Node) =>
        moduleInitializers.recordWrite(
          (node as estree.ForInStatement | estree.ForOfStatement).left,
        ),

      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        moduleInitializers.recordCall(call);
        excludeIfExecuted(getImmediatelyInvokedFunction(call.callee));
      },
      NewExpression: (node: estree.Node) =>
        excludeIfExecuted(getImmediatelyConstructedFunction((node as estree.NewExpression).callee)),
      TaggedTemplateExpression: (node: estree.Node) =>
        excludeIfExecuted(
          getImmediatelyInvokedFunction((node as estree.TaggedTemplateExpression).tag),
        ),

      'Program:exit': () => {
        const moduleFactories = moduleInitializers.getExcludedFactories(node =>
          complexity.hasNestedFunction(node),
        );
        complexity.reportOverThreshold(
          threshold,
          node => immediatelyExecuted.has(node) || moduleFactories.has(node),
        );
      },
    };
  },
};
