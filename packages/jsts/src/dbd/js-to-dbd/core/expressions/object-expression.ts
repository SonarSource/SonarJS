import { createReference } from '../values/reference';
import type { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
} from '../function-definition';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleObjectExpression: ExpressionHandler<TSESTree.ObjectExpression> = (
  context,
  node,
) => {
  const { properties } = node;

  const objectValueIdentifier = context.scope.createValueIdentifier();
  const objectValue = createReference(objectValueIdentifier);

  const instructions: Array<Instruction> = [
    createCallInstruction(
      objectValueIdentifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
  ];

  for (const property of properties) {
    if (property.type === AST_NODE_TYPES.Property) {
      if (
        property.value.type === AST_NODE_TYPES.AssignmentPattern ||
        property.value.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression
      ) {
        throw new Error(`Unable to handle object property type ${property.value.type}`);
      }
      const { value: propertyValue, instructions: propertyValueInstructions } = handleExpression(
        context,
        property.value,
      );
      const { instructions: propertyKeyInstructions } = handleExpression(context, property.key);

      instructions.push(...propertyKeyInstructions);
      instructions.push(...propertyValueInstructions);

      instructions.push(
        createCallInstruction(
          context.scope.createValueIdentifier(),
          null,
          /**
           * todo
           * It seems like DBD IR is nob able to support property names being value references.
           * This is because the `set-field` call doesn't support the property name to be passed as
           * operand:
           * `foo.x = 5` translates to `call #set-field# x(foo, 5)` instead of `call #set-field# (foo, x, 5)`
           */
          createSetFieldFunctionDefinition((property.key as TSESTree.Identifier).name),
          [objectValue, propertyValue],
          node.loc,
        ),
      );
    }
  }

  return {
    instructions,
    value: objectValue,
  };
};
