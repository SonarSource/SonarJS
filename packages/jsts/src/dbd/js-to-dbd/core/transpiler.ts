import { TSESTree } from '@typescript-eslint/typescript-estree';
import { type Variable } from './variable';
import { createFunctionDefinition2 } from './function-definition';
import { createReturnInstruction } from './instructions/return-instruction';
import { createNull } from './values/null';
import { createFunctionInfo as _createFunctionInfo, type FunctionInfo } from './function-info';
import { ContextManager } from './context-manager';

import { getSignature, isTerminated } from './utils';
import { handleStatement } from './statements';

export type Transpiler = (ast: TSESTree.Program, fileName: string) => Array<FunctionInfo>;

export const createTranspiler = (
  rootPath: string,
  hostDefinedProperties: Array<Variable> = [],
): Transpiler => {
  return (program, fileName) => {
    const functionInfos: Array<FunctionInfo> = [];

    const createFunctionInfo = (name: string, signature: string): FunctionInfo => {
      return _createFunctionInfo(fileName, createFunctionDefinition2(name, signature));
    };

    const processFunctions = (
      functionInfo: FunctionInfo,
      node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression,
    ) => {
      functionInfos.push(functionInfo);
      // we might want to provide this to the function once, the main is handled
      const context = new ContextManager(
        rootPath,
        functionInfo,
        node.loc,
        hostDefinedProperties,
        (functionInfo, node) => processFunctions(functionInfo, node),
      );
      node.params.forEach(param => context.addParameter(param));
      handleStatement(context, node.body as any); // todo;
      const currentBlock = context.block.getCurrentBlock();
      if (!isTerminated(currentBlock)) {
        currentBlock.instructions.push(createReturnInstruction(createNull(), node.loc));
      }
    };

    const processTopLevel = (functionInfo: FunctionInfo, node: TSESTree.Program) => {
      functionInfos.push(functionInfo);
      const context = new ContextManager(
        rootPath,
        functionInfo,
        node.loc,
        hostDefinedProperties,
        (functionInfo, node) => processFunctions(functionInfo, node),
      );
      node.body
        .filter(statement => statement.type !== TSESTree.AST_NODE_TYPES.FunctionDeclaration)
        .forEach(statement => handleStatement(context, statement));
      const currentBlock = context.block.getCurrentBlock();
      if (!isTerminated(currentBlock)) {
        currentBlock.instructions.push(createReturnInstruction(createNull(), node.loc));
      }
    };

    // process the program
    const mainFunctionInfo = createFunctionInfo(
      '#__main__',
      getSignature(rootPath, fileName, '#__main__'),
    );
    processTopLevel(mainFunctionInfo, program);
    program.body.forEach(statement => {
      if (statement.type !== TSESTree.AST_NODE_TYPES.FunctionDeclaration) {
        return;
      }
      const functionInfo = createFunctionInfo(
        statement.id.name,
        getSignature(rootPath, fileName, statement.id.name),
      );
      processFunctions(functionInfo, statement);
    });

    return functionInfos;
  };
};
