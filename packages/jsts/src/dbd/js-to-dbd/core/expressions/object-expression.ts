import { createCallInstruction } from '../instructions/call-instruction';
import { createNewObjectFunctionDefinition } from '../function-definition';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { compileAsAssignment, handleExpression } from './index';
import { type ExpressionHandler } from '../expression-handler';
import { createValue } from '../value';

export const handleObjectExpression: ExpressionHandler<TSESTree.ObjectExpression> = (
  node,
  functionInfo,
) => {
  const { properties } = node;
  const { scopeManager, addInstructions } = functionInfo;

  const object = createValue('object', scopeManager.createValueIdentifier());

  addInstructions([
    createCallInstruction(
      object.identifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
  ]);

  for (const property of properties) {
    if (property.type === AST_NODE_TYPES.Property) {
      if (
        property.value.type === AST_NODE_TYPES.AssignmentPattern ||
        property.value.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression
      ) {
        throw new Error(`Unable to handle object property type ${property.value.type}`);
      }

      const propertyValue = handleExpression(property.value, functionInfo);

      const propertyKeyInstructions = compileAsAssignment(
        property.key,
        functionInfo,
        propertyValue,
      );
      addInstructions(propertyKeyInstructions);
    }
  }

  return object;
};
