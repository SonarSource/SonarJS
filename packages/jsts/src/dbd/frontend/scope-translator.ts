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
import { TSESTree } from '@typescript-eslint/utils';
import {
  BasicBlock,
  CallInstruction,
  FunctionId,
  FunctionInfo,
  Instruction,
  Location,
  Parameter,
  ReturnInstruction,
  TypeInfo,
  TypeInfo_Kind,
  ValueTable,
} from '../ir-gen/ir_pb';
import { getLocation } from './utils';
import { Function, isBuiltinFunction } from './builtin-functions';
import { toUnixPath } from '@sonar/shared';

export class ScopeTranslator {
  valueIdCounter = 1;
  valueTable = new ValueTable();
  basicBlock;
  variableMap = new Map<string, number>();
  hasReturnInstruction = false;
  signaturePrefix: string;
  methodCalls: Set<string> = new Set<string>();
  parameters: Parameter[] = [];

  constructor(
    public filename: string,
    public root: string,
    public node: TSESTree.Node,
  ) {
    const relativeFilename =
      root && filename.startsWith(root) ? filename.slice(root.length + 1) : filename;
    this.signaturePrefix = toUnixPath(relativeFilename).replace(/\//g, '_');
    this.basicBlock = new BasicBlock({ location: getLocation(node) });
  }

  getTypeInfo(valueId: number): TypeInfo | undefined {
    if (valueId === 0) {
      return new TypeInfo({ kind: TypeInfo_Kind.PRIMITIVE, qualifiedName: 'null' });
    }
    const existingConstant = this.valueTable.constants.find(
      constant => constant.valueId === valueId,
    );
    if (existingConstant) {
      return existingConstant.typeInfo;
    }
    const existingTypeName = this.valueTable.typeNames.find(
      typeName => typeName.valueId === valueId,
    );
    if (existingTypeName) {
      return existingTypeName.typeInfo;
    }
    throw new Error(`Type info not found for ${valueId}`);
  }

  getResolvedVariable(expression: TSESTree.Expression) {
    if (expression.type !== TSESTree.AST_NODE_TYPES.Identifier) {
      throw new Error(`Unable to resolve variable given expression type ${expression.type}`);
    }
    const variableName = expression.name;
    if (!this.variableMap.has(variableName)) {
      throw new Error(`Unable to resolve variable with identifier "${variableName}"`);
    }
    return this.variableMap.get(variableName)!;
  }

  getFunctionSignature(simpleName: string) {
    if (isBuiltinFunction(simpleName) && simpleName !== Function.Main) {
      return simpleName;
    }
    return `${this.signaturePrefix}.${simpleName}`;
  }

  getFunctionId(simpleName: string) {
    return new FunctionId({ simpleName, signature: this.getFunctionSignature(simpleName) });
  }

  addParameter(param: TSESTree.Parameter) {
    const valueId = this.getNewValueId();
    if (param.type !== 'Identifier') {
      throw new Error(`Unknown method parameter type ${param.type}`);
    }
    const parameter = new Parameter({
      valueId,
      name: param.name,
      definitionLocation: getLocation(param),
    });
    this.valueTable.parameters.push(parameter);
    this.variableMap.set(param.name, valueId);
    this.parameters.push(parameter);
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
    variableName?: string,
    staticType?: TypeInfo,
    isInstanceMethodCall?: boolean,
  ) {
    const callInstruction = new CallInstruction({
      location,
      valueId,
      variableName,
      functionId,
      arguments: args,
      staticType,
      isInstanceMethodCall,
    });
    if (!isBuiltinFunction(functionId.simpleName)) {
      this.methodCalls.add(this.getFunctionSignature(functionId.simpleName));
    }
    this.basicBlock.instructions.push(
      new Instruction({ instr: { case: 'callInstruction', value: callInstruction } }),
    );
    return valueId;
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
    if (
      this.node &&
      this.node.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration &&
      this.node.id
    ) {
      functionId = this.getFunctionId(this.node.id?.name);
    } else {
      functionId = this.getFunctionId(Function.Main);
    }

    return new FunctionInfo({
      functionId,
      fileId: this.filename,
      basicBlocks: [this.basicBlock],
      values: this.valueTable,
      parameters: this.parameters,
    });
  }
}
