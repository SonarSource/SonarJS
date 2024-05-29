import { TSESTree } from '@typescript-eslint/utils';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { createConstant } from '../values/constant';
import type { ExpressionHandler } from '../expression-handler';
import { createCallInstruction } from '../instructions/call-instruction';
import { createGetFieldFunctionDefinition } from '../function-definition';
import { createNull, createReference } from '../values/reference';

export const handleLiteral: ExpressionHandler<TSESTree.Literal> = (
  node,
  context,
  scopeReference,
) => {
  const { createValueIdentifier } = context.scopeManager;
  const instructions: Array<Instruction> = [];

  let value: Value;

  if (node.value === null) {
    value = createNull();
  } else {
    if (scopeReference) {
      // todo: if node.value is a number then is this an array access?
      value = createReference(createValueIdentifier());

      instructions.push(
        createCallInstruction(
          value.identifier,
          null,
          createGetFieldFunctionDefinition(`${node.value}`),
          [scopeReference],
          node.loc,
        ),
      );
    } else {
      value = createConstant(createValueIdentifier(), node.value);
    }
  }

  return {
    instructions,
    value,
  };
};
