import { ContextManager } from '../context-manager';
import { createReference } from '../values/reference';
import { createNull } from '../values/null';
import { TSESTree } from '@typescript-eslint/utils';
import { CompilationResult } from './index';

export function handleIdentifier(
  context: ContextManager,
  node: TSESTree.Identifier,
): CompilationResult {
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
}
