import { TSESTree } from '@typescript-eslint/utils';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { createNull } from '../values/null';
import { createConstant } from '../values/constant';
import type { ExpressionHandler } from '../expression-handler';
import { createCallInstruction } from '../instructions/call-instruction';
import { createGetFieldFunctionDefinition } from '../function-definition';
import { createReference } from '../values/reference';

export const handleLiteral: ExpressionHandler<TSESTree.Literal> = (context, node, scope) => {
  const instructions: Array<Instruction> = [];

  let value: Value;

  if (node.value === null) {
    value = createNull();
  } else {
    if (scope) {
      // todo: if node.value is a number then this is an array access
      value = createReference(context.scope.createValueIdentifier());

      instructions.push(
        createCallInstruction(
          value.identifier,
          null,
          createGetFieldFunctionDefinition(`${node.value}`),
          [scope],
          node.loc,
        ),
      );
    } else {
      value = createConstant(context.scope.createValueIdentifier(), node.value);
    }
  }

  return {
    instructions,
    value,
  };
};
