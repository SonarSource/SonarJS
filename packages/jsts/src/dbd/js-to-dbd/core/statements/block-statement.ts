import { ContextManager } from '../context-manager';
import { TSESTree } from '@typescript-eslint/utils';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import { createNewObjectFunctionDefinition } from '../function-definition';
import { handleStatement } from './index';

export function handleBlockStatement(context: ContextManager, node: TSESTree.BlockStatement) {
  const blockScope = context.scope.createScope();
  context.scope.push(blockScope);

  const bbn = context.block.createScopedBlock(node.loc);

  // branch current block to bbn
  context.block.getCurrentBlock().instructions.push(createBranchingInstruction(bbn, node.loc));

  // promote bbn as current block
  context.block.push(bbn);

  // create scope instruction
  const instruction = createCallInstruction(
    blockScope.identifier,
    null,
    createNewObjectFunctionDefinition(),
    [],
    node.loc,
  );

  context.block.getCurrentBlock().instructions.push(instruction);
  node.body.forEach(statement => handleStatement(context, statement));

  context.scope.pop();

  const bbnPlusOne = context.block.createScopedBlock(node.loc);

  // branch the current block to bbnPlusOne
  context.block
    .getCurrentBlock()
    .instructions.push(createBranchingInstruction(bbnPlusOne, node.loc));

  // promote bbnPlusOne as current block
  context.block.push(bbnPlusOne);
}
