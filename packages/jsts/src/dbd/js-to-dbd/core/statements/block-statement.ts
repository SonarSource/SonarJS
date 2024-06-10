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

export const handleBlockStatement: StatementHandler<TSESTree.BlockStatement> = (
  node,
  functionInfo,
) => {
  if (node.body.length === 0) {
    return;
  }

  const { scopeManager, createBlock, getCurrentBlock, pushBlock, addInstructions } = functionInfo;

  const bbn = createBlock(node.loc);

  // branch current block to bbn
  addInstructions([createBranchingInstruction(bbn, node.loc)]);

  // promote bbn as current block
  pushBlock(bbn);

  const currentScope = scopeManager.getScope(node);
  const currentScopeReference = createReference(scopeManager.getScopeId(currentScope));
  // create scope instruction
  const instruction = createCallInstruction(
    currentScopeReference.identifier,
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
      [
        createReference(currentScopeReference.identifier),
        createReference(functionInfo.scopeManager.getScopeId(currentScope.upper!)),
      ],
      node.loc,
    ),
  );

  node.body.forEach(statement => {
    return handleStatement(statement, functionInfo);
  });

  const bbnPlusOne = createBlock(node.loc);

  // branch the current block to bbnPlusOne
  if (!isTerminated(getCurrentBlock())) {
    getCurrentBlock().instructions.push(createBranchingInstruction(bbnPlusOne, node.loc));
  }

  // promote bbnPlusOne as current block
  pushBlock(bbnPlusOne);
};
