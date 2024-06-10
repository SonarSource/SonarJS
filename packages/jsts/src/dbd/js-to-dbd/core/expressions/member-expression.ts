import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createGetFieldFunctionDefinition } from '../function-definition';

export const handleMemberExpression: ExpressionHandler<TSESTree.MemberExpression> = (
  node,
  functionInfo,
) => {
  const { object, property } = node;
  const objectValue = handleExpression(object, functionInfo);

  if (property.type === AST_NODE_TYPES.Literal) {
    const resultValue = createReference(functionInfo.scopeManager.createValueIdentifier());
    functionInfo.addInstructions([
      createCallInstruction(
        resultValue.identifier,
        null,
        createGetFieldFunctionDefinition(String(property.value)),
        [objectValue],
        property.loc,
      ),
    ]);
    return resultValue;
  }
  const propertyValue = handleExpression(property, functionInfo);

  return propertyValue;
};
