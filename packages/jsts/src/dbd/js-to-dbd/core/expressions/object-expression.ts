import { createCallInstruction } from '../instructions/call-instruction';
import { createNewObjectFunctionDefinition } from '../function-definition';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { compileAsDeclaration, handleExpression } from './index';
import { type ExpressionHandler } from '../expression-handler';

export const handleObjectExpression: ExpressionHandler<TSESTree.ObjectExpression> = (
  node,
  record,
  context,
) => {
  const { properties } = node;
  const { scopeManager, addInstructions } = context;

  const object = scopeManager.createBindingsHolder();

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

      const { value: propertyValue } = handleExpression(property.value, record, context);

      const propertyKeyInstructions = compileAsDeclaration(
        property.key,
        object,
        context,
        propertyValue,
      );
      addInstructions(propertyKeyInstructions);
    }
  }

  return {
    record,
    value: object,
  };
};
