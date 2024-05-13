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

// import * as estree from 'estree';
import { Rule } from 'eslint';
import {
  BasicBlock,
  CallInstruction,
  Constant,
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
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
// import { isNumber, isRequiredParserServices, isString } from '../../rules/helpers';

function getLocation(node: TSESTree.Node) {
  return new Location({
    startLine: node.loc.start.line,
    endLine: node.loc.end.line,
    startColumn: node.loc.start.column,
    endColumn: node.loc.end.column,
  });
}

// const getTypeQualifiedName = (context: Rule.RuleContext, node: estree.Node) => {
//   const parserServices = context.sourceCode.parserServices;
//   if (!isRequiredParserServices(parserServices)) {
//     return 'unknown';
//   }
//
//   if (isString(node, parserServices)) {
//     return 'string';
//   } else if (isNumber(node, parserServices)) {
//     return 'number';
//   }
//   return 'unknown';
// };

export function translateMethod(context: Rule.RuleContext, node: TSESTree.FunctionDeclaration) {
  const functionId = new FunctionId({ simpleName: node.id?.name });

  let valueIdCounter = 1;
  const valueTable = new ValueTable();
  const basicBlock = new BasicBlock({ id: 0, location: getLocation(node) });
  const variableMap = new Map<string, number>();
  let hasReturnInstruction = false;

  const getNewValueId = () => {
    const resultValueId = valueIdCounter;
    valueIdCounter++;
    return resultValueId;
  };

  node.params.forEach(param => {
    if (param.type !== 'Identifier') {
      throw new Error(`Unknown method parameter type ${param.type}`);
    }
    const valueId = getNewValueId();
    valueTable.parameters.push(new Parameter({ valueId, name: param.name }));
    variableMap.set(param.name, valueId);
  });

  const handleValueWithoutCall = (value: string | number | bigint | boolean | RegExp) => {
    const valueId = getNewValueId();
    const typeInfo = new TypeInfo({
      kind: TypeInfo_Kind.PRIMITIVE,
      qualifiedName: 'string', // TODO: Correctly handle variable type
    });
    const newConstant = new Constant({ value: String(value), valueId, typeInfo });
    valueTable.constants.push(newConstant);
    return valueId;
  };

  const handleLiteralWithoutCall = (literal: TSESTree.Literal) => {
    const value = literal.value;
    let valueId;
    if (value === null) {
      valueId = 0;
    } else {
      valueId = handleValueWithoutCall(value);
    }
    return valueId;
  };

  const handleExpressionLiteral = (literal: TSESTree.Literal, variableName: string | undefined) => {
    const functionId = new FunctionId({ simpleName: '#id#', isStandardLibraryFunction: true });
    const valueId = handleLiteralWithoutCall(literal);
    addCallExpression(getLocation(literal), valueId, functionId, [], variableName);
    if (variableName) {
      variableMap.set(variableName, valueId);
    }
    return valueId;
  };

  const handleObjectExpression = (
    expression: TSESTree.ObjectExpression,
    variableName: string | undefined,
  ) => {
    const objectValueId = getNewValueId();
    const typeInfo = new TypeInfo({
      kind: TypeInfo_Kind.CLASS,
      qualifiedName: 'object',
    });
    const newConstant = new Constant({ valueId: objectValueId, typeInfo });
    valueTable.constants.push(newConstant);
    addCallExpression(
      getLocation(expression),
      objectValueId,
      new FunctionId({ simpleName: '#new-object#', isStandardLibraryFunction: true }),
      [],
      variableName,
    );
    expression.properties.forEach(prop => {
      if (prop.type === 'SpreadElement' || prop.value.type === 'AssignmentPattern') {
        throw new Error('Unsupported object expression parsing');
      }
      if (prop.value.type === 'TSEmptyBodyFunctionExpression') {
        return;
      }
      const keyId = parseExpression(prop.key);
      const valueId = parseExpression(prop.value);
      const resultValueId = getNewValueId();
      addCallExpression(
        getLocation(prop),
        resultValueId,
        new FunctionId({ simpleName: '#map-set#', isStandardLibraryFunction: true }),
        [objectValueId, keyId, valueId],
      );
    });
    if (variableName) {
      variableMap.set(variableName, objectValueId);
    }
    return objectValueId;
  };

  const handleMemberExpression = (memberExpression: TSESTree.MemberExpression): number => {
    if (memberExpression.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
      throw new Error(
        `Unsupported member expression property type ${memberExpression.property.type} ${JSON.stringify(getLocation(memberExpression.property))}`,
      );
    }
    let objectValueId;
    if (memberExpression.object.type === TSESTree.AST_NODE_TYPES.Identifier) {
      objectValueId = variableMap.get(memberExpression.object.name);
    } else if (memberExpression.object.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
      objectValueId = handleMemberExpression(memberExpression.object);
    }

    if (!objectValueId) {
      throw new Error(
        `Unable to parse member expression. Unknown object variable ${JSON.stringify(getLocation(memberExpression.object))}`,
      );
    }
    if (memberExpression.parent.type === TSESTree.AST_NODE_TYPES.CallExpression) {
      return objectValueId;
    } else {
      const fieldName = memberExpression.property.name;
      const functionId = new FunctionId({
        simpleName: `#get-field# ${fieldName}`,
        isStandardLibraryFunction: true,
      });
      const resultValueId = getNewValueId();
      addCallExpression(getLocation(memberExpression), resultValueId, functionId, [objectValueId]);
      return resultValueId;
    }
  };

  const handleCallExpression = (callExpression: TSESTree.CallExpression) => {
    let calleeValueId;
    let functionSimpleName;
    switch (callExpression.callee.type) {
      case TSESTree.AST_NODE_TYPES.MemberExpression:
        calleeValueId = handleMemberExpression(callExpression.callee);
        if (callExpression.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
          throw new Error(
            `Unhandled method call ${JSON.stringify(getLocation(callExpression.callee.property))}`,
          );
        }
        functionSimpleName = callExpression.callee.property.name;
        break;
      default:
        throw new Error(`Unsupported call expression callee ${callExpression.callee.type}`);
    }
    const resultValueId = getNewValueId();
    addCallExpression(
      getLocation(callExpression),
      resultValueId,
      new FunctionId({ simpleName: functionSimpleName }),
      [calleeValueId],
    );
    return resultValueId;
  };

  const parseExpression = (
    expression: TSESTree.Expression | null,
    variableName: string | undefined = undefined,
  ): number => {
    if (!expression) {
      throw new Error('Null Expression provided');
    }
    switch (expression.type) {
      case TSESTree.AST_NODE_TYPES.Literal:
        return handleExpressionLiteral(expression, variableName);
      case TSESTree.AST_NODE_TYPES.ObjectExpression:
        return handleObjectExpression(expression, variableName);
      case TSESTree.AST_NODE_TYPES.Identifier:
        return handleValueWithoutCall(expression.name);
      case TSESTree.AST_NODE_TYPES.CallExpression:
        return handleCallExpression(expression);
      case TSESTree.AST_NODE_TYPES.MemberExpression:
        return handleMemberExpression(expression);
      default:
        throw new Error(`Unhandled Expression type ${expression.type}`);
    }
  };

  const addCallExpression = (
    location: Location,
    valueId: number,
    functionId: FunctionId,
    args: number[] = [],
    variableName: string | undefined = undefined,
  ) => {
    const callInstruction = new CallInstruction({
      location,
      valueId,
      variableName,
      functionId,
      arguments: args,
    });
    basicBlock.instructions.push(
      new Instruction({ instr: { case: 'callInstruction', value: callInstruction } }),
    );
  };

  const addReturnInstruction = (
    location: Location,
    returnValue: number | undefined = undefined,
  ) => {
    const returnInstruction = new ReturnInstruction({ location, returnValue });
    basicBlock.instructions.push(
      new Instruction({ instr: { case: 'returnInstruction', value: returnInstruction } }),
    );
    hasReturnInstruction = true;
  };

  const parseVariableDeclaration = (declaration: TSESTree.VariableDeclaration) => {
    if (declaration.declarations.length !== 1) {
      throw new Error(
        `Unable to handle declaration with ${declaration.declarations.length} declarations (${JSON.stringify(getLocation(declaration))})`,
      );
    }
    const declarator = declaration.declarations[0];
    if (!declarator || declarator.type !== AST_NODE_TYPES.VariableDeclarator) {
      throw new Error('Unhandled declaration');
    }
    if (declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier) {
      throw new Error(`Unhandled declaration id type ${declarator.id.type}`);
    }
    const variableName = declarator.id.name;
    parseExpression(declarator.init, variableName);
  };

  const addNullReturn = (location: Location) => {
    addReturnInstruction(location);
  };

  const parseReturnStatement = (returnStatement: TSESTree.ReturnStatement) => {
    if (returnStatement.argument === null) {
      addNullReturn(getLocation(returnStatement));
    } else if (returnStatement.argument.type !== TSESTree.AST_NODE_TYPES.Literal) {
      throw new Error(`Unhandled return statement argument type ${returnStatement.argument.type}`);
    } else {
      const returnValue = handleLiteralWithoutCall(returnStatement.argument);
      addReturnInstruction(getLocation(returnStatement), returnValue);
    }
  };

  const parseStatement = (statement: TSESTree.Statement) => {
    switch (statement.type) {
      case TSESTree.AST_NODE_TYPES.VariableDeclaration:
        return parseVariableDeclaration(statement);
      case TSESTree.AST_NODE_TYPES.ExpressionStatement:
        return parseExpression(statement.expression);
      case TSESTree.AST_NODE_TYPES.ReturnStatement:
        return parseReturnStatement(statement);
      default:
        throw new Error(`Unhandled statement type ${statement.type}`);
    }
  };

  node.body.body.forEach(parseStatement);
  if (!hasReturnInstruction) {
    addNullReturn(getLocation(node));
  }

  return new FunctionInfo({
    functionId,
    fileId: context.filename,
    basicBlocks: [basicBlock],
    values: valueTable,
  });
}
