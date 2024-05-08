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
  Constant,
  FunctionId,
  FunctionInfo,
  Instruction,
  Location,
  TypeInfo,
  TypeInfo_Kind,
  ValueTable,
} from '../../dbd-ir-gen/ir_pb';
import { TSESTree } from '@typescript-eslint/utils';
import { isNumber, isRequiredParserServices, isString } from '../helpers';
import { writeFileSync } from 'fs';
import { join } from 'path';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      message: 'Add an initial value to this "reduce()" call.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node: estree.Node) {
        const result = translateToIR(context, node as TSESTree.FunctionDeclaration);
        if (result) {
          const content = JSON.stringify(result.toJson(), null, '\t');
          const fileName = join(__dirname, `${context.settings.name}`);
          writeFileSync(`${fileName}.json`, content, { flag: 'w' });
          writeFileSync(`${fileName}.buf`, result.toBinary(), { flag: 'w' });
        } else {
          console.log("Couldn't parse");
        }
      },
    };
  },
};

function getLocation(node: TSESTree.Statement) {
  return new Location({
    startLine: node.loc.start.line,
    endLine: node.loc.end.line,
    startColumn: node.loc.start.column,
    endColumn: node.loc.end.column,
  });
}

function translateToIR(context: Rule.RuleContext, node: TSESTree.FunctionDeclaration) {
  const functionId = new FunctionId({ simpleName: node.id?.name });
  const parserServices = context.sourceCode.parserServices;
  if (!isRequiredParserServices(parserServices)) {
    return null;
  }

  let valueIdCounter = 1;
  const valueTable = new ValueTable();

  const getTypeQualifiedName = (node: estree.Node) => {
    if (isString(node, parserServices)) {
      return 'string';
    } else if (isNumber(node, parserServices)) {
      return 'number';
    }
    return 'unknown';
  };
  const parseNewValue = (declaration: TSESTree.VariableDeclaration): [number, string] => {
    const variableDeclaration = declaration.declarations[0]!;
    const variableName = (variableDeclaration.id as TSESTree.Identifier).name;
    const value = String((variableDeclaration.init as TSESTree.Literal).value);
    const valueId = valueIdCounter;
    valueIdCounter++;

    const typeInfo = new TypeInfo({
      kind: TypeInfo_Kind.PRIMITIVE,
      qualifiedName: getTypeQualifiedName(variableDeclaration as estree.Node),
    });
    const newConstant = new Constant({ value, valueId, typeInfo });
    valueTable.constants.push(newConstant);
    return [valueId, variableName];
  };

  const translateBlock = (node: TSESTree.BlockStatement) => {
    const instructions = node.body
      .filter<TSESTree.VariableDeclaration>(
        (statement: TSESTree.Statement): statement is TSESTree.VariableDeclaration =>
          statement.type === 'VariableDeclaration',
      )
      .map((statement: TSESTree.VariableDeclaration) => {
        const functionId = new FunctionId({ simpleName: '#id#' });
        const [valueId, variableName] = parseNewValue(statement);
        const callInstruction = new CallInstruction({
          location: getLocation(statement),
          valueId,
          variableName,
          functionId,
        });
        return new Instruction({ instr: { case: 'callInstruction', value: callInstruction } });
      });

    return new BasicBlock({ id: 0, location: getLocation(node), instructions });
  };
  const basicBlock = translateBlock(node.body);
  return new FunctionInfo({
    functionId,
    fileId: context.filename,
    basicBlocks: [basicBlock],
    values: valueTable,
  });
}
