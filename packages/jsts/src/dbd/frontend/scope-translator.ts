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
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import {
  BasicBlock,
  CallInstruction,
  FunctionId,
  FunctionInfo,
  Instruction,
  Location,
  ReturnInstruction,
  ValueTable,
} from '../ir-gen/ir_pb';
import { getLocation } from './utils';

export class ScopeTranslator {
  valueIdCounter;
  valueTable;
  basicBlock;
  variableMap;
  hasReturnInstruction;
  methodCalls: Set<string>;
  signature: string;

  constructor(
    public context: Rule.RuleContext,
    public node: TSESTree.Node,
  ) {
    this.valueIdCounter = 1;
    this.valueTable = new ValueTable();
    this.basicBlock = new BasicBlock({ location: getLocation(node) });
    this.variableMap = new Map<string, number>();
    this.hasReturnInstruction = false;
    this.methodCalls = new Set<string>();
    this.signature = context.settings.name;
  }

  isEmpty() {
    return this.basicBlock.instructions.length === 0;
  }

  getNewValueId() {
    const resultValueId = this.valueIdCounter;
    this.valueIdCounter++;
    return resultValueId;
  }

  addCallExpression(
    location: Location,
    valueId: number,
    functionId: FunctionId,
    args: number[] = [],
    variableName: string | undefined = undefined,
  ) {
    const callInstruction = new CallInstruction({
      location,
      valueId,
      variableName,
      functionId,
      arguments: args,
    });
    if (!functionId.simpleName.startsWith('#')) {
      this.methodCalls.add(functionId.simpleName);
    }
    this.basicBlock.instructions.push(
      new Instruction({ instr: { case: 'callInstruction', value: callInstruction } }),
    );
  }

  addReturnInstruction(location: Location, returnValue: number) {
    const returnInstruction = new ReturnInstruction({ location, returnValue });
    this.basicBlock.instructions.push(
      new Instruction({ instr: { case: 'returnInstruction', value: returnInstruction } }),
    );
    this.hasReturnInstruction = true;
    return returnValue;
  }

  addNullReturn(location: Location) {
    return this.addReturnInstruction(location, 0);
  }

  checkReturn() {
    if (!this.hasReturnInstruction) {
      this.addNullReturn(getLocation(this.node));
    }
  }

  finish() {
    this.checkReturn();
    let functionId;
    if (this.node && this.node.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration) {
      functionId = new FunctionId({
        simpleName: this.node.id?.name,
        signature: this.signature + '.' + this.node.id?.name,
      });
    } else {
      functionId = new FunctionId({
        simpleName: '#__main__',
        signature: this.signature + '.#__main__',
      });
    }

    return new FunctionInfo({
      functionId,
      fileId: this.context.filename,
      basicBlocks: [this.basicBlock],
      values: this.valueTable,
    });
  }
}
