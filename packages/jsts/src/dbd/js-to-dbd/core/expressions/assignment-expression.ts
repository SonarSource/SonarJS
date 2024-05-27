import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { compileAsAssignment, handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';
import type { Instruction } from '../instruction';
import { createNull } from '../values/null';
import type { CallInstruction } from '../instructions/call-instruction';
import { createFunctionInfo } from '../function-info';
import { createFunctionDefinition2 } from '../function-definition';

export const handleAssignmentExpression: ExpressionHandler<TSESTree.AssignmentExpression> = (
  context,
  node,
  scope,
) => {
  const instructions: Array<Instruction> = [];

  const { left, right } = node;

  // rhs
  const { instructions: rightInstructions, value: rightValue } = handleExpression(
    context,
    right,
    scope,
  );

  instructions.push(...rightInstructions);

  // lhs
  const leftInstructions = compileAsAssignment(context, left, rightValue, scope);

  instructions.push(...leftInstructions);

  // hack
  // todo: DBD should be able to handle calling functions by reference
  if (right.type === AST_NODE_TYPES.ArrowFunctionExpression) {
    const name = leftInstructions
      .map(instruction => {
        const signature = (instruction as unknown as CallInstruction).functionDefinition.signature;

        return signature.replace(/#[sg]et-field# /, '');
      })
      .join('__');

    const functionInfo = createFunctionInfo(
      context.functionInfo.fileName,
      createFunctionDefinition2(name, name),
    );

    context.processFunction(functionInfo, right);
  }

  return {
    instructions,
    value: createNull(),
  };
};
