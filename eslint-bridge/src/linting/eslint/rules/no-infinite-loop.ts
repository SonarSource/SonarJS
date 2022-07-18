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
// https://sonarsource.github.io/rspec/#/rspec/S2189/javascript

import { Linter, Rule } from 'eslint';
import * as estree from 'estree';
import { childrenOf } from '../linter/visitors';
import { interceptReport } from './decorators/helpers';
import { isUndefined } from './helpers';

const linter = new Linter();
const noUnmodifiedLoopEslint = interceptReport(
  linter.getRules().get('no-unmodified-loop-condition')!,
  onReport,
);
const MESSAGE = "Correct this loop's end condition to not be invariant.";
export const rule: Rule.RuleModule = {
  // we copy the meta to have proper messageId
  meta: noUnmodifiedLoopEslint.meta,
  create(context: Rule.RuleContext) {
    const noUnmodifiedLoopListener = noUnmodifiedLoopEslint.create(context);
    return {
      WhileStatement: (node: estree.Node) => {
        checkWhileStatement(node, context);
      },
      DoWhileStatement: (node: estree.Node) => {
        checkWhileStatement(node, context);
      },
      ForStatement: (node: estree.Node) => {
        const forStatement = node as estree.ForStatement;
        if (
          !forStatement.test ||
          (forStatement.test.type === 'Literal' && forStatement.test.value === true)
        ) {
          const hasEndCondition = LoopVisitor.hasEndCondition(forStatement.body, context);
          if (!hasEndCondition) {
            const firstToken = context.getSourceCode().getFirstToken(node);
            context.report({
              loc: firstToken!.loc,
              message: MESSAGE,
            });
          }
        }
      },
      'Program:exit'() {
        // @ts-ignore
        noUnmodifiedLoopListener['Program:exit']!();
      },
    };
  },
};

function checkWhileStatement(node: estree.Node, context: Rule.RuleContext) {
  const whileStatement = node as estree.WhileStatement | estree.DoWhileStatement;
  if (whileStatement.test.type === 'Literal' && whileStatement.test.value === true) {
    const hasEndCondition = LoopVisitor.hasEndCondition(whileStatement.body, context);
    if (!hasEndCondition) {
      const firstToken = context.getSourceCode().getFirstToken(node);
      context.report({ loc: firstToken!.loc, message: MESSAGE });
    }
  }
}

function onReport(context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) {
  if ('node' in reportDescriptor) {
    const node = reportDescriptor['node'];
    if (isUndefined(node)) {
      return;
    }
    context.report(reportDescriptor);
  }
}

class LoopVisitor {
  hasEndCondition = false;

  static hasEndCondition(node: estree.Node, context: Rule.RuleContext) {
    const visitor = new LoopVisitor();
    visitor.visit(node, context);
    return visitor.hasEndCondition;
  }

  private visit(root: estree.Node, context: Rule.RuleContext) {
    const visitNode = (node: estree.Node, isNestedLoop = false) => {
      switch (node.type) {
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'ForStatement':
          isNestedLoop = true;
          break;
        case 'FunctionExpression':
        case 'FunctionDeclaration':
          // Don't consider nested functions
          return;
        case 'BreakStatement':
          if (!isNestedLoop || !!node.label) {
            this.hasEndCondition = true;
          }
          break;
        case 'YieldExpression':
        case 'ReturnStatement':
        case 'ThrowStatement':
          this.hasEndCondition = true;
          return;
      }
      childrenOf(node, context.getSourceCode().visitorKeys).forEach(child =>
        visitNode(child, isNestedLoop),
      );
    };
    visitNode(root);
  }
}
