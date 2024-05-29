import { createReference } from '../values/reference';
import type { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import { createNewObjectFunctionDefinition } from '../function-definition';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { compileAsDeclaration, handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';
import { createScope } from '../scope';

export const handleObjectExpression: ExpressionHandler<TSESTree.ObjectExpression> = (
  node,
  context,
) => {
  const { properties } = node;
  const { scopeManager } = context;

  const objectValue = createReference(context.scopeManager.createValueIdentifier());

  const instructions: Array<Instruction> = [
    createCallInstruction(
      objectValue.identifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
  ];

  scopeManager.unshiftScope(createScope(objectValue.identifier));

  for (const property of properties) {
    if (property.type === AST_NODE_TYPES.Property) {
      if (
        property.value.type === AST_NODE_TYPES.AssignmentPattern ||
        property.value.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression
      ) {
        throw new Error(`Unable to handle object property type ${property.value.type}`);
      }

      const { value: propertyValue, instructions: propertyValueInstructions } = handleExpression(
        property.value,
        context,
        objectValue,
      );

      const propertyKeyInstructions = compileAsDeclaration(
        property.key,
        propertyValue,
        context,
        objectValue,
      );

      instructions.push(...propertyValueInstructions);
      instructions.push(...propertyKeyInstructions);
    }
  }

  scopeManager.shiftScope();

  return {
    instructions,
    value: objectValue,
  };
};
