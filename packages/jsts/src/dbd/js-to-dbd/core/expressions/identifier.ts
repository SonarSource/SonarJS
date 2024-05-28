import { createReference } from '../values/reference';
import { TSESTree } from '@typescript-eslint/utils';
import type { ExpressionHandler } from '../expression-handler';
import { createGetFieldFunctionDefinition } from '../function-definition';
import { createNull } from '../values/null';
import type { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (context, node, scope) => {
  const { name } = node;
  const { scope: scopeManager } = context;
  const { getVariableAndOwner, createValueIdentifier } = scopeManager;

  const instructions: Array<Instruction> = [];

  const getScopeReference = (name: string) => {
    const variableAndOwner = getVariableAndOwner(name);

    if (variableAndOwner) {
      return createReference(variableAndOwner.owner.identifier);
    }

    return createNull();
  };

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
