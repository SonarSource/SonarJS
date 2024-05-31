import { TSESTree } from '@typescript-eslint/utils';
import type { Instruction } from '../instruction';
import { createConstant, createNull } from '../values/constant';
import { type ExpressionHandler } from '../expression-handler';
import { createCallInstruction } from '../instructions/call-instruction';
import { createNewObjectFunctionDefinition } from '../function-definition';
import { createValue } from '../value';

export const handleLiteral: ExpressionHandler<TSESTree.Literal> = (node, _scope, context) => {
  const { constantRegistry, createValueIdentifier, valueByConstantTypeRegistry } =
    context.scopeManager;
  const instructions: Array<Instruction> = [];

  if (node.value === null) {
    return {
      instructions,
      record: createNull(),
      value: createNull(),
    };
  }

  let constant = constantRegistry.get(node.value);

  if (!constant) {
    constant = createConstant(createValueIdentifier(), node.value);

    constantRegistry.set(node.value, constant);
  }

  let value = valueByConstantTypeRegistry.get(typeof constant.value);

  if (!value) {
    value = createValue(typeof constant.value, context.scopeManager.createValueIdentifier());

    valueByConstantTypeRegistry.set(typeof constant.value, value);

    instructions.push(
      createCallInstruction(
        value.identifier,
        null,
        createNewObjectFunctionDefinition(),
        [],
        node.loc,
      ),
    );
  }

  return {
    record: value,
    value: constant,
  };
};
