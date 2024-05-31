import { TSESTree } from '@typescript-eslint/utils';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
} from '../function-definition';
import type { StatementHandler } from '../statement-handler';
import { handleStatement } from './index';
import { isTerminated } from '../utils';
import { createReference } from '../values/reference';

export const handleBlockStatement: StatementHandler<TSESTree.BlockStatement> = (node, context) => {
  const { blockManager, scopeManager, createScopedBlock, addInstructions } = context;
  const { getCurrentBlock, pushBlock } = blockManager;
  const { createDeclarativeEnvironmentRecord, getCurrentEnvironmentRecord } = scopeManager;

  const parentScopeIdentifier = getCurrentEnvironmentRecord().identifier;
  const blockEnvironmentRecord = createDeclarativeEnvironmentRecord(context.functionInfo);

  scopeManager.pushEnvironmentRecord(blockEnvironmentRecord);

  const bbn = createScopedBlock(node.loc);

  // branch current block to bbn
  addInstructions([createBranchingInstruction(bbn, node.loc)]);

  // promote bbn as current block
  pushBlock(bbn);

  // create scope instruction
  const instruction = createCallInstruction(
    blockEnvironmentRecord.identifier,
    null,
    createNewObjectFunctionDefinition(),
    [],
    node.loc,
  );

  addInstructions([instruction]);

  getCurrentBlock().instructions.push(
    createCallInstruction(
      scopeManager.createValueIdentifier(),
      null,
      createSetFieldFunctionDefinition('@parent'),
      [createReference(blockEnvironmentRecord.identifier), createReference(parentScopeIdentifier)],
      node.loc,
    ),
  );

  node.body.forEach(statement => {
    return handleStatement(statement, context);
  });

  scopeManager.popEnvironmentRecord();

  const bbnPlusOne = createScopedBlock(node.loc);

  // branch the current block to bbnPlusOne
  if (!isTerminated(getCurrentBlock())) {
    getCurrentBlock().instructions.push(createBranchingInstruction(bbnPlusOne, node.loc));
  }

  // promote bbnPlusOne as current block
  pushBlock(bbnPlusOne);
};
