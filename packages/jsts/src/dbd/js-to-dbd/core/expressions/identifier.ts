import { createNull, createReference } from '../values/reference';
import { TSESTree } from '@typescript-eslint/utils';
import type { ExpressionHandler } from '../expression-handler';
import { createGetFieldFunctionDefinition } from '../function-definition';
import type { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import { getParameter } from '../utils';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (
  node,
  context,
  scopeReference,
) => {
  const { name } = node;
  const { functionInfo, scopeManager } = context;
  const { getVariableAndOwner, createValueIdentifier, getAssignment } = scopeManager;

  let instructions: Array<Instruction> = [];

  // check if this is a reference to a parameter
  const parameter = getParameter(functionInfo, node.name);

  if (parameter) {
    return {
      instructions,
      value: parameter,
    };
  }

  let variableAndOwner = getVariableAndOwner(name, scopeReference);

  if (variableAndOwner) {
    const assignment = getAssignment(variableAndOwner.variable, scopeReference);

    if (assignment) {
      return {
        instructions,
        value: createReference(assignment.identifier),
      };
    } else {
      return {
        instructions,
        value: createNull(),
      };
    }
  }

  const value = createReference(createValueIdentifier());

  instructions.push(
    createCallInstruction(
      value.identifier,
      null,
      createGetFieldFunctionDefinition(name),
      [scopeReference],
      node.loc,
    ),
  );

  return {
    instructions,
    value,
  };
};
