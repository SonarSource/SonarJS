import { type ScopeManager } from './scope-manager';
import { createFunctionInfo, FunctionInfo } from './function-info';
import { BlockManager, createBlockManager } from './block-manager';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Location } from './location';
import { type Block } from './block';
import { Instruction } from './instruction';
import { createParameter } from './values/parameter';
import {
  createFunctionDefinition,
  createSetFieldFunctionDefinition,
  generateSignature,
} from './function-definition';
import { createScopeDeclarationInstruction, isTerminated } from './utils';
import { createCallInstruction } from './instructions/call-instruction';
import { createReference } from './values/reference';
import { handleStatement as _handleStatement } from './statements';
import { createReturnInstruction } from './instructions/return-instruction';
import { createNull } from './values/constant';

export interface Context {
  readonly blockManager: BlockManager;
  readonly functionInfo: FunctionInfo;
  readonly scopeManager: ScopeManager;

  createScopedBlock(location: Location): Block;

  addInstructions(instructions: Array<Instruction>): void;

  processFunction(name: string, node: TSESTree.FunctionDeclarationWithName): FunctionInfo;
}

export const createContext = (
  functionInfo: FunctionInfo,
  blockManager: BlockManager,
  scopeManager: ScopeManager,
): Context => {
  return {
    blockManager,
    functionInfo,
    scopeManager,
    processFunction(name, node) {
      const parentScopeName = '@parent';
      const parentReference = createParameter(
        scopeManager.createValueIdentifier(),
        parentScopeName,
        node.loc,
      );

      // resolve the function parameters
      const functionParametersName = '@params';
      const functionParametersReference = createParameter(
        scopeManager.createValueIdentifier(),
        functionParametersName,
        node.loc,
      );

      const functionParameters = [parentReference, functionParametersReference];

      const { fileName } = functionInfo;

      // create the function info
      const childFunctionInfo = createFunctionInfo(
        fileName,
        createFunctionDefinition(name, generateSignature(name, fileName)),
        functionParameters,
      );

      // create the block manager
      const blockManager = createBlockManager();

      // create the main function block
      const block = blockManager.createBlock(node.loc);

      blockManager.pushBlock(block);
      const currentScopeId = scopeManager.getScopeId(scopeManager.getScope(node));

      // add the scope creation instruction
      block.instructions.push(createScopeDeclarationInstruction(currentScopeId, node.loc));

      // add the "set parent" instruction
      block.instructions.push(
        createCallInstruction(
          scopeManager.createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition('@parent'),
          [createReference(currentScopeId), parentReference],
          node.loc,
        ),
      );

      const context = createContext(childFunctionInfo, blockManager, scopeManager);

      const handleStatement = (statement: TSESTree.Statement) => {
        return _handleStatement(statement, context);
      };

      // handle the body statements
      node.body.body.forEach(handleStatement);

      const lastBlock = blockManager.getCurrentBlock();

      if (!isTerminated(lastBlock)) {
        lastBlock.instructions.push(createReturnInstruction(createNull(), node.loc));
      }

      childFunctionInfo.blocks.push(...blockManager.blocks);

      scopeManager.addFunctionInfo(childFunctionInfo);

      return childFunctionInfo;
    },
    createScopedBlock: location => {
      return blockManager.createBlock(location);
    },
    addInstructions: instructions => {
      blockManager.getCurrentBlock().instructions.push(...instructions);
    },
  };
};
