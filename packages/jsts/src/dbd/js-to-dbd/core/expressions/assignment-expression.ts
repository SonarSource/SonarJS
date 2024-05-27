import { createAssignment } from '../variable';
import { createCallInstruction } from '../instructions/call-instruction';
import { createSetFieldFunctionDefinition } from '../function-definition';
import { createReference } from '../values/reference';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleAssignmentExpression: ExpressionHandler<TSESTree.AssignmentExpression> = (
  context,
  node,
) => {
  let variableName: string;

  const { left, right } = node;

  if (left.type === TSESTree.AST_NODE_TYPES.Identifier) {
    variableName = left.name;
  } else {
    // todo
    variableName = left.type;
  }

  const { instructions: rightInstructions, value: rightValue } = handleExpression(context, right);

  context.block.getCurrentBlock().instructions.push(...rightInstructions);

  // An assignment to an identifier is an assignment to a property of the current scope
  const variableAndOwner = context.scope.getVariableAndOwner(variableName);

  if (variableAndOwner) {
    const { variable, owner } = variableAndOwner;

    const assignment = createAssignment(context.scope.createValueIdentifier(), variable);

    context.scope.getCurrentScope().assignments.set(variableName, assignment);

    const instruction = createCallInstruction(
      assignment.identifier,
      null,
      createSetFieldFunctionDefinition(variable.name),
      [createReference(owner.identifier), rightValue],
      node.loc,
    );

    return {
      instructions: [...rightInstructions, instruction],
      value: rightValue,
    };
  } else {
    console.error('Unable to derive AssignmentExpression identifier');

    return {
      instructions: [],
      value: rightValue,
    };
  }
};
