import { Block, createBlock } from './block';
import {
  createFunctionDefinition,
  createSetFieldFunctionDefinition,
  FunctionDefinition,
  generateSignature,
} from './function-definition';
import { createParameter, Parameter } from './values/parameter';
import type { FunctionReference } from './values/function-reference';
import { createScopeDeclarationInstruction, isTerminated } from './utils';
import { createCallInstruction } from './instructions/call-instruction';
import { createReference } from './values/reference';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { handleStatement as _handleStatement, handleStatement } from './statements';
import { createReturnInstruction } from './instructions/return-instruction';
import { createNull } from './values/constant';
import { ScopeManager } from './scope-manager';
import type { Location } from './location';
import { Instruction } from './instruction';
import { createBranchingInstruction } from './instructions/branching-instruction';

export type FunctionInfo = {
  readonly scopeManager: ScopeManager;
  readonly fileName: string;
  readonly blocks: Array<Block>;
  readonly definition: FunctionDefinition;
  readonly functionReferences: Array<FunctionReference>;
  readonly parameters: Array<Parameter>;

  createBlock(location: Location): Block;
  getCurrentBlock(): Block;
  pushBlock(block: Block): void;
  addInstructions(instructions: Array<Instruction>): void;
};

export const createFunctionInfo = <T extends TSESTree.NodeOrTokenData>(
  name: string,
  node: T,
  scopeManager: ScopeManager,
): FunctionInfo => {
  const blocks: Array<Block> = [];
  let blockIndex: number = 0;

  const location = node.loc;
  const definition = createFunctionDefinition(name, generateSignature(name, scopeManager.fileName));
  // create the main function block
  const currentScopeId = scopeManager.getScopeId(scopeManager.getScope(node));
  const block = createBlock(blockIndex++, location);
  blocks.push(block);
  // add the scope creation instruction
  block.instructions.push(createScopeDeclarationInstruction(currentScopeId, location));
  const parameters = [];

  if (node.type !== AST_NODE_TYPES.Program) {
    const parentScopeName = '@parent';
    const parentReference = createParameter(
      scopeManager.createValueIdentifier(),
      parentScopeName,
      location,
    );
    parameters.push(parentReference);

    // resolve the function parameters
    const functionParametersName = '@params';
    const functionParametersReference = createParameter(
      scopeManager.createValueIdentifier(),
      functionParametersName,
      location,
    );
    parameters.push(functionParametersReference);

    // add the "set parent" instruction
    block.instructions.push(
      createCallInstruction(
        scopeManager.createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition('@parent'),
        [createReference(currentScopeId), parentReference],
        location,
      ),
    );
  } else {
    setGlobals(scopeManager, block, location, currentScopeId);

    // create the main function block
    const mainBlock = createBlock(blockIndex++, location);
    blocks.push(mainBlock);

    // branch the global block to the main block
    block.instructions.push(createBranchingInstruction(mainBlock, location));
  }

  const functionInfo: FunctionInfo = {
    scopeManager,
    fileName: scopeManager.fileName,
    definition,
    blocks: [],
    functionReferences: [],
    parameters,
    createBlock: location => {
      return createBlock(blockIndex++, location);
    },
    getCurrentBlock() {
      return blocks[blocks.length - 1];
    },
    pushBlock: block => {
      blocks.push(block);
    },
    addInstructions: instructions => {
      blocks[blocks.length - 1].instructions.push(...instructions);
    },
  };

  // handle the body statements
  getBody(node).forEach((statement: TSESTree.Statement) => {
    return handleStatement(statement, functionInfo);
  });

  const lastBlock = blocks[blocks.length - 1];

  if (!isTerminated(lastBlock)) {
    lastBlock.instructions.push(createReturnInstruction(createNull(), location));
  }

  scopeManager.addFunctionInfo(functionInfo);

  return functionInfo;
};

function getBody(node: TSESTree.NodeOrTokenData): TSESTree.ProgramStatement[] {
  if (node.type === AST_NODE_TYPES.FunctionDeclaration) {
    return (node as TSESTree.FunctionDeclaration).body.body;
  }
  if (node.type === AST_NODE_TYPES.Program) {
    return (node as TSESTree.Program).body;
  }
  throw new Error(`Type ${node.type} is not yet supported`);
}

function setGlobals(
  scopeManager: ScopeManager,
  block: Block,
  location: TSESTree.SourceLocation,
  scopeId: number,
) {
  // globalThis is a reference to the outer scope itself
  block.instructions.push(
    createCallInstruction(
      scopeManager.createValueIdentifier(),
      null,
      createSetFieldFunctionDefinition('globalThis'),
      [createReference(scopeId), createReference(scopeId)],
      location,
    ),
  );
}
