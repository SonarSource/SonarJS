import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from '../expressions';
import type { Block } from '../block';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createConditionalBranchingInstruction } from '../instructions/conditional-branching-instruction';
import { isTerminated } from '../utils';
import { handleStatement } from './index';
import type { StatementHandler } from '../statement-handler';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';

export const handleIfStatement: StatementHandler<TSESTree.IfStatement> = (node, functionInfo) => {
  const { consequent, alternate, test } = node;
  const { getCurrentBlock, pushBlock, createBlock } = functionInfo;

  // the "finally" block belongs to the same scope as the current block
  const finallyBlock = createBlock(node.loc);

  const processNode = (innerNode: TSESTree.Statement | null): Block => {
    const loc = innerNode?.loc ?? node.loc;
    const block = createBlock(loc);
    if (innerNode === null) {
      innerNode = {
        type: AST_NODE_TYPES.BlockStatement,
        parent: node.parent,
        loc: node.loc,
        range: node.range,
        body: [],
      };
    }

    pushBlock(block);

    handleStatement(innerNode, functionInfo);

    if (!isTerminated(getCurrentBlock())) {
      // branch the CURRENT BLOCK to the finally one
      getCurrentBlock().instructions.push(createBranchingInstruction(finallyBlock, loc));
    }

    return block;
  };

  const testValue = handleExpression(test, functionInfo);

  const currentBlock = getCurrentBlock();

  // process the consequent block
  const consequentBlock = processNode(consequent);

  // process the alternate block
  const alternateBlock = processNode(alternate);

  // add the conditional branching instruction
  currentBlock.instructions.push(
    createConditionalBranchingInstruction(testValue, consequentBlock, alternateBlock, node.loc),
  );

  pushBlock(finallyBlock);
};
