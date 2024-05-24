import { ContextManager } from '../context-manager';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from '../expressions';
import type { Block } from '../block';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createConditionalBranchingInstruction } from '../instructions/conditional-branching-instruction';
import { createScopeDeclarationInstruction, isTerminated } from '../utils';
import { handleStatement } from './index';

export function handleIfStatement(context: ContextManager, node: TSESTree.IfStatement) {
  const { consequent, alternate, test } = node;
  const currentBlock = context.block.getCurrentBlock();

  // the "finally" block belongs to the same scope as the current block
  const finallyBlock = context.block.createScopedBlock(node.loc);

  const processNode = (innerNode: TSESTree.Statement | null): Block => {
    const currentScope = context.scope.push(context.scope.createScope());

    const loc = innerNode === null ? node.loc : innerNode.loc;
    let block;
    if (!innerNode) {
      block = context.block.createScopedBlock(loc);
      context.block.push(block);
    } else {
      block = context.block.createScopedBlock(loc);

      block.instructions.push(createScopeDeclarationInstruction(currentScope, innerNode.loc));

      context.block.push(block);
      handleStatement(context, innerNode);
    }
    context.scope.pop();
    if (!isTerminated(context.block.getCurrentBlock())) {
      // branch the CURRENT BLOCK to the finally one
      context.block
        .getCurrentBlock()
        .instructions.push(createBranchingInstruction(finallyBlock, loc));
    }
    return block;
  };

  const { instructions: testInstructions, value: testValue } = handleExpression(context, test);

  currentBlock.instructions.push(...testInstructions);

  // process the consequent block
  const consequentBlock = processNode(consequent);

  // process the alternate block
  const alternateBlock = processNode(alternate);

  // add the conditional branching instruction
  currentBlock.instructions.push(
    createConditionalBranchingInstruction(testValue, consequentBlock, alternateBlock, node.loc),
  );

  context.block.push(finallyBlock);
}
