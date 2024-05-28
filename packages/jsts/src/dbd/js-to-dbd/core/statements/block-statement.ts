import { TSESTree } from '@typescript-eslint/utils';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import { createNewObjectFunctionDefinition } from '../function-definition';
import type { StatementHandler } from '../statement-handler';

export const handleBlockStatement: StatementHandler<TSESTree.BlockStatement> = (node, context) => {
  const { scopeManager } = context;
  const { createScope, createScopedBlock, getCurrentBlock, pushBlock, unshiftScope, shiftScope } =
    scopeManager;

  const blockScope = createScope();

  unshiftScope(blockScope);

  const bbn = createScopedBlock(node.loc);

  // branch current block to bbn
  getCurrentBlock().instructions.push(createBranchingInstruction(bbn, node.loc));

  // promote bbn as current block
  pushBlock(bbn);

  // create scope instruction
  const instruction = createCallInstruction(
    blockScope.identifier,
    null,
    createNewObjectFunctionDefinition(),
    [],
    node.loc,
  );

  getCurrentBlock().instructions.push(instruction);

  // node.body.forEach(handleStatement);

  shiftScope();

  const bbnPlusOne = createScopedBlock(node.loc);

  // branch the current block to bbnPlusOne
  getCurrentBlock().instructions.push(createBranchingInstruction(bbnPlusOne, node.loc));

  // promote bbnPlusOne as current block
  pushBlock(bbnPlusOne);
};
