import { createReference } from '../values/reference';
import { createNull } from '../values/null';
import { TSESTree } from '@typescript-eslint/utils';
import type { ExpressionHandler } from '../expression-handler';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (context, node) => {
  const { name } = node;

  const variableAndOwner = context.scope.getVariableAndOwner(name);

  if (variableAndOwner) {
    const { variable } = variableAndOwner;
    const assignment = context.scope.getAssignment(variable);

    if (assignment) {
      return {
        instructions: [],
        value: createReference(assignment.identifier),
      };
    }
  }

  return {
    instructions: [],
    value: createNull(),
  };
};
