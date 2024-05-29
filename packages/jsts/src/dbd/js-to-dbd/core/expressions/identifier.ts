import { createReference } from '../values/reference';
import { TSESTree } from '@typescript-eslint/utils';
import type { ExpressionHandler } from '../expression-handler';
import { createGetFieldFunctionDefinition } from '../function-definition';
import { createNull } from '../values/null';
import type { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import { getParameter } from '../utils';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (node, context, scope) => {
  const { name } = node;
  const { functionInfo, scopeManager } = context;
  const { getVariableAndOwner, createValueIdentifier, getAssignment, getScopeReference } =
    scopeManager;

  let instructions: Array<Instruction> = [];

  // check if this is a reference to a parameter
  const parameter = getParameter(functionInfo, node.name);

  if (parameter) {
    return {
      instructions,
      value: parameter,
    };
  }

  let variableAndOwner = getVariableAndOwner(name, scope);

  if (variableAndOwner) {
    const assignment = getAssignment(variableAndOwner.variable, scope);

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
      [scope || getScopeReference(name)],
      node.loc,
    ),
  );

  return {
    instructions,
    value,
  };
};
