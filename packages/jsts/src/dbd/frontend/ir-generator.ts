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
} from '../../dbd/ir-gen/ir_pb';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { isNumber, isRequiredParserServices, isString } from '../../rules/helpers';

function getLocation(node: TSESTree.Statement) {
  return new Location({
    startLine: node.loc.start.line,
    endLine: node.loc.end.line,
    startColumn: node.loc.start.column,
    endColumn: node.loc.end.column,
  });
}

const getTypeQualifiedName = (context: Rule.RuleContext, node: estree.Node) => {
  const parserServices = context.sourceCode.parserServices;
  if (!isRequiredParserServices(parserServices)) {
    return 'unknown';
  }

  if (isString(node, parserServices)) {
    return 'string';
  } else if (isNumber(node, parserServices)) {
    return 'number';
  }
  return 'unknown';
};

export function translateMethod(context: Rule.RuleContext, node: TSESTree.FunctionDeclaration) {
  const functionId = new FunctionId({ simpleName: node.id?.name });

  let valueIdCounter = 1;
  const valueTable = new ValueTable();

  const handleExpressionLiteral = (literal: TSESTree.Literal): number => {
    const value = literal.value;
    let valueId;
    if (value === null) {
      valueId = 0;
    } else {
      valueId = valueIdCounter;
      valueIdCounter++;
      const typeInfo = new TypeInfo({
        kind: TypeInfo_Kind.PRIMITIVE,
        qualifiedName: getTypeQualifiedName(context, literal as estree.Node),
      });
      const newConstant = new Constant({ value: String(value), valueId, typeInfo });
      valueTable.constants.push(newConstant);
    }
    return valueId;
  };

  const parseExpression = (expression: TSESTree.Expression | null) => {
    if (!expression) {
      throw new Error('Null Expression provided');
    }
    switch (expression.type) {
      case TSESTree.AST_NODE_TYPES.Literal:
        return handleExpressionLiteral(expression);
      default:
        throw new Error('Unhandled Expression');
    }
  };

  const parseVariableDeclaration = (declaration: TSESTree.VariableDeclaration): Instruction => {
    const functionId = new FunctionId({ simpleName: '#id#' });
    const declarator = declaration.declarations[0];
    if (!declarator || declarator.type !== AST_NODE_TYPES.VariableDeclarator) {
      throw new Error('Unhandled declaration');
    }
    const valueId = parseExpression(declarator.init);
    const variableName = (declarator.id as TSESTree.Identifier).name;
    const callInstruction = new CallInstruction({
      location: getLocation(declaration),
      valueId,
      variableName,
      functionId,
    });
    return new Instruction({ instr: { case: 'callInstruction', value: callInstruction } });
  };

  const parseStatement = (statement: TSESTree.Statement): Instruction | null => {
    switch (statement.type) {
      case 'VariableDeclaration':
        return parseVariableDeclaration(statement);
      default:
        return null;
    }
  };

  const translateBlock = (node: TSESTree.BlockStatement) => {
    const instructions = node.body
      .map(parseStatement)
      .filter((instr): instr is Instruction => !!instr);
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
