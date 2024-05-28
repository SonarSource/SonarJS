import { createReference } from '../values/reference';
import { TSESTree } from '@typescript-eslint/utils';
import type { ExpressionHandler } from '../expression-handler';
import { createGetFieldFunctionDefinition } from '../function-definition';
import { createNull } from '../values/null';
import type { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (node, context, scope) => {
  const { name } = node;
  const { scopeManager } = context;
  const {
    getVariableAndOwner,
    createValueIdentifier,
    getParameter,
    getAssignment,
    getScopeReference,
  } = scopeManager;

  let instructions: Array<Instruction> = [];

  // check if this is a reference to a parameter
  const parameter = getParameter(node.name);

  if (parameter) {
    return {
      instructions,
      value: parameter,
    };
  }

  const variableAndOwner = getVariableAndOwner(name);

  if (variableAndOwner) {
    const assignment = getAssignment(variableAndOwner.variable);

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
