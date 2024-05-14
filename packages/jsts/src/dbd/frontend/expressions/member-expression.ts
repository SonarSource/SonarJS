import { TSESTree } from '@typescript-eslint/utils';
import { getLocation } from '../utils';
import { FunctionId } from '../../ir-gen/ir_pb';
import { ScopeTranslator } from '../scope-translator';

export function handleMemberExpression(
  scopeTranslator: ScopeTranslator,
  memberExpression: TSESTree.MemberExpression,
): number {
  if (memberExpression.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
    throw new Error(
      `Unsupported member expression property type ${memberExpression.property.type} ${JSON.stringify(getLocation(memberExpression.property))}`,
    );
  }
  let objectValueId;
  if (memberExpression.object.type === TSESTree.AST_NODE_TYPES.Identifier) {
    objectValueId = scopeTranslator.variableMap.get(memberExpression.object.name);
  } else if (memberExpression.object.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
    objectValueId = handleMemberExpression(scopeTranslator, memberExpression.object);
  }

  if (!objectValueId) {
    throw new Error(
      `Unable to parse member expression. Unknown object variable ${JSON.stringify(getLocation(memberExpression.object))}`,
    );
  }
  if (memberExpression.parent.type === TSESTree.AST_NODE_TYPES.CallExpression) {
    return objectValueId;
  } else {
    const fieldName = memberExpression.property.name;
    const functionId = new FunctionId({
      simpleName: `#get-field# ${fieldName}`,
      isStandardLibraryFunction: true,
    });
    const resultValueId = scopeTranslator.getNewValueId();
    scopeTranslator.addCallExpression(getLocation(memberExpression), resultValueId, functionId, [
      objectValueId,
    ]);
    return resultValueId;
  }
}
