import { createReference } from '../values/reference';
import type { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import { createNewObjectFunctionDefinition } from '../function-definition';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { compileAsAssignment, handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleObjectExpression: ExpressionHandler<TSESTree.ObjectExpression> = (
  context,
  node,
) => {
  const { properties } = node;

  const objectValue = createReference(context.scope.createValueIdentifier());

  const instructions: Array<Instruction> = [
    createCallInstruction(
      objectValue.identifier,
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
        objectValue,
      );

      const propertyKeyInstructions = compileAsAssignment(
        context,
        property.key,
        propertyValue,
        objectValue,
      );

      instructions.push(...propertyKeyInstructions);
      instructions.push(...propertyValueInstructions);
    }
  }

  return {
    instructions,
    value: objectValue,
  };
};
