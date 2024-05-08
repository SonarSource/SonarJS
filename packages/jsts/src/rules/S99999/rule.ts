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
// https://sonarsource.github.io/rspec/#/rspec/S99999/javascript

import * as estree from 'estree';
import { Rule } from 'eslint';
import {
  BasicBlock,
  CallInstruction,
  FunctionId,
  FunctionInfo,
  Instruction,
  Location,
} from '../../dbd-ir-gen/ir_pb';
import { TSESTree } from '@typescript-eslint/utils';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      message: 'Add an initial value to this "reduce()" call.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node: estree.Node) {
        translateToIR(context, node as TSESTree.FunctionDeclaration);
      },
    };
  },
};

function getLocation(node: TSESTree.Statement) {
  return new Location({
    startLine: node.loc.start.line,
    endLine: node.loc.end.line,
    startColumn: node.loc.start.column,
    endColumn: node.loc.end.line,
  });
}

function translateToIR(context: Rule.RuleContext, node: TSESTree.FunctionDeclaration) {
  const functionId = new FunctionId({ simpleName: node.id?.name });

  const translateBlock = (node: TSESTree.BlockStatement) => {
    const instructions = node.body
      .filter<TSESTree.VariableDeclaration>(
        (statement: TSESTree.Statement): statement is TSESTree.VariableDeclaration =>
          statement.type === 'VariableDeclaration',
      )
      .map((statement: TSESTree.VariableDeclaration) => {
        const callInstruction = new CallInstruction({
          location: getLocation(statement),
        });
        return new Instruction({ instr: { case: 'callInstruction', value: callInstruction } });
      });

    return new BasicBlock({ id: 0, location: getLocation(node), instructions });
  };
  const basicBlock = translateBlock(node.body);
  return new FunctionInfo({ functionId, fileId: context.filename, basicBlocks: [basicBlock] });
}
