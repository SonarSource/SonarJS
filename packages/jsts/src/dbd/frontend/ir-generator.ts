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

export class ScopeTranslator {
  valueIdCounter;
  valueTable;
  basicBlock;
  variableMap;
  hasReturnInstruction;
  node: TSESTree.Node | undefined;

  constructor(
    public context: Rule.RuleContext,
    node: TSESTree.Node | undefined = undefined,
  ) {
    this.valueIdCounter = 1;
    this.valueTable = new ValueTable();
    this.basicBlock = new BasicBlock({});
    this.variableMap = new Map<string, number>();
    this.hasReturnInstruction = false;
    this.node = node;

    if (node) {
      this.basicBlock.location = getLocation(node);
    }
  }

  isEmpty() {
    return this.basicBlock.instructions.length === 0;
  }

  getNewValueId() {
    const resultValueId = this.valueIdCounter;
    this.valueIdCounter++;
    return resultValueId;
  }

  handleValueWithoutCall(value: string | number | bigint | boolean | RegExp) {
    const valueId = this.getNewValueId();
    const typeInfo = new TypeInfo({
      kind: TypeInfo_Kind.PRIMITIVE,
      qualifiedName: 'string', // TODO: Correctly handle variable type
    });
    const newConstant = new Constant({ value: String(value), valueId, typeInfo });
    this.valueTable.constants.push(newConstant);
    return valueId;
  }

  handleLiteralWithoutCall(literal: TSESTree.Literal) {
    const value = literal.value;
    let valueId;
    if (value === null) {
      valueId = 0;
    } else {
      valueId = this.handleValueWithoutCall(value);
    }
    return valueId;
  }

  handleExpressionLiteral(literal: TSESTree.Literal, variableName: string | undefined) {
    const functionId = new FunctionId({ simpleName: '#id#', isStandardLibraryFunction: true });
    const valueId = this.handleLiteralWithoutCall(literal);
    this.addCallExpression(getLocation(literal), valueId, functionId, [], variableName);
    if (variableName) {
      this.variableMap.set(variableName, valueId);
    }
    return valueId;
  }

  handleObjectExpression(expression: TSESTree.ObjectExpression, variableName: string | undefined) {
    const objectValueId = this.getNewValueId();
    const typeInfo = new TypeInfo({
      kind: TypeInfo_Kind.CLASS,
      qualifiedName: 'object',
    });
    const newConstant = new Constant({ valueId: objectValueId, typeInfo });
    this.valueTable.constants.push(newConstant);
    this.addCallExpression(
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
      const keyId = this.handleExpression(prop.key);
      const valueId = this.handleExpression(prop.value);
      const resultValueId = this.getNewValueId();
      this.addCallExpression(
        getLocation(prop),
        resultValueId,
        new FunctionId({ simpleName: '#map-set#', isStandardLibraryFunction: true }),
        [objectValueId, keyId, valueId],
      );
    });
    if (variableName) {
      this.variableMap.set(variableName, objectValueId);
    }
    return objectValueId;
  }

  handleMemberExpression(memberExpression: TSESTree.MemberExpression): number {
    if (memberExpression.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
      throw new Error(
        `Unsupported member expression property type ${memberExpression.property.type} ${JSON.stringify(getLocation(memberExpression.property))}`,
      );
    }
    let objectValueId;
    if (memberExpression.object.type === TSESTree.AST_NODE_TYPES.Identifier) {
      objectValueId = this.variableMap.get(memberExpression.object.name);
    } else if (memberExpression.object.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
      objectValueId = this.handleMemberExpression(memberExpression.object);
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
      const resultValueId = this.getNewValueId();
      this.addCallExpression(getLocation(memberExpression), resultValueId, functionId, [
        objectValueId,
      ]);
      return resultValueId;
    }
  }

  handleCallExpression(callExpression: TSESTree.CallExpression) {
    let calleeValueId;
    let simpleName;
    switch (callExpression.callee.type) {
      case TSESTree.AST_NODE_TYPES.MemberExpression:
        calleeValueId = this.handleMemberExpression(callExpression.callee);
        if (callExpression.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
          throw new Error(
            `Unhandled method call ${JSON.stringify(getLocation(callExpression.callee.property))}`,
          );
        }
        simpleName = callExpression.callee.property.name;
        break;
      case TSESTree.AST_NODE_TYPES.Identifier:
        simpleName = callExpression.callee.name;
        break;
      default:
        throw new Error(`Unsupported call expression callee ${callExpression.callee.type}`);
    }
    const resultValueId = this.getNewValueId();
    let args: number[] = [];
    if (calleeValueId) {
      args = [calleeValueId];
    }
    this.addCallExpression(
      getLocation(callExpression),
      resultValueId,
      new FunctionId({ simpleName }),
      args,
    );
    return resultValueId;
  }

  handleExpression(
    expression: TSESTree.Expression | null,
    variableName: string | undefined = undefined,
  ): number {
    if (!expression) {
      throw new Error('Null Expression provided');
    }
    switch (expression.type) {
      case TSESTree.AST_NODE_TYPES.Literal:
        return this.handleExpressionLiteral(expression, variableName);
      case TSESTree.AST_NODE_TYPES.ObjectExpression:
        return this.handleObjectExpression(expression, variableName);
      case TSESTree.AST_NODE_TYPES.Identifier:
        return this.handleValueWithoutCall(expression.name);
      case TSESTree.AST_NODE_TYPES.CallExpression:
        return this.handleCallExpression(expression);
      case TSESTree.AST_NODE_TYPES.MemberExpression:
        return this.handleMemberExpression(expression);
      default:
        throw new Error(`Unhandled Expression type ${expression.type}`);
    }
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
    this.basicBlock.instructions.push(
      new Instruction({ instr: { case: 'callInstruction', value: callInstruction } }),
    );
  }

  addReturnInstruction(
    location: Location | undefined = undefined,
    returnValue: number | undefined = undefined,
  ) {
    const returnInstruction = new ReturnInstruction({ location, returnValue });
    this.basicBlock.instructions.push(
      new Instruction({ instr: { case: 'returnInstruction', value: returnInstruction } }),
    );
    this.hasReturnInstruction = true;
  }

  handleVariableDeclaration(declaration: TSESTree.VariableDeclaration) {
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
    this.handleExpression(declarator.init, variableName);
  }

  addNullReturn(location: Location | undefined = undefined) {
    this.addReturnInstruction(location);
  }

  handleReturnStatement(returnStatement: TSESTree.ReturnStatement) {
    if (returnStatement.argument === null) {
      this.addNullReturn(getLocation(returnStatement));
    } else if (returnStatement.argument.type !== TSESTree.AST_NODE_TYPES.Literal) {
      throw new Error(`Unhandled return statement argument type ${returnStatement.argument.type}`);
    } else {
      const returnValue = this.handleLiteralWithoutCall(returnStatement.argument);
      this.addReturnInstruction(getLocation(returnStatement), returnValue);
    }
  }

  handleStatement(statement: TSESTree.Statement) {
    switch (statement.type) {
      case TSESTree.AST_NODE_TYPES.VariableDeclaration:
        return this.handleVariableDeclaration(statement);
      case TSESTree.AST_NODE_TYPES.ExpressionStatement:
        return this.handleExpression(statement.expression);
      case TSESTree.AST_NODE_TYPES.ReturnStatement:
        return this.handleReturnStatement(statement);
      default:
        throw new Error(`Unhandled statement type ${statement.type}`);
    }
  }

  checkReturn() {
    if (!this.hasReturnInstruction) {
      this.addNullReturn();
    }
  }

  finish() {
    this.checkReturn();
    let functionId;
    if (this.node && this.node.type === AST_NODE_TYPES.FunctionDeclaration) {
      functionId = new FunctionId({ simpleName: this.node.id?.name });
    } else {
      functionId = new FunctionId({ simpleName: '#__main__' });
    }

    return new FunctionInfo({
      functionId,
      fileId: this.context.filename,
      basicBlocks: [this.basicBlock],
      values: this.valueTable,
    });
  }
}

export function translateTopLevel(context: Rule.RuleContext, node: TSESTree.Program) {
  const scopeTranslator = new ScopeTranslator(context, node as TSESTree.Node);
  node.body.forEach(param => {
    if (param.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration) {
      // skip function declarations
      return;
    }
    scopeTranslator.handleStatement(param);
  });
  if (scopeTranslator.isEmpty()) {
    return null;
  }
  return scopeTranslator.finish();
}

export function translateMethod(context: Rule.RuleContext, node: TSESTree.FunctionDeclaration) {
  const scopeTranslator = new ScopeTranslator(context, node);

  node.params.forEach(param => {
    if (param.type !== 'Identifier') {
      throw new Error(`Unknown method parameter type ${param.type}`);
    }
    const valueId = scopeTranslator.getNewValueId();
    scopeTranslator.valueTable.parameters.push(new Parameter({ valueId, name: param.name }));
    scopeTranslator.variableMap.set(param.name, valueId);
  });

  node.body.body.forEach(scopeTranslator.handleStatement, scopeTranslator);
  return scopeTranslator.finish();
}
