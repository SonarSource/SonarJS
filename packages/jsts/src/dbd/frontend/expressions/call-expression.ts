import { TSESTree } from '@typescript-eslint/utils';
import { handleMemberExpression } from './member-expression';
import { getLocation } from '../utils';
import { FunctionId } from '../../ir-gen/ir_pb';
import { ScopeTranslator } from '../scope-translator';

export function handleCallExpression(
  scopeTranslator: ScopeTranslator,
  callExpression: TSESTree.CallExpression,
) {
  let calleeValueId;
  let simpleName;
  switch (callExpression.callee.type) {
    case TSESTree.AST_NODE_TYPES.MemberExpression:
      calleeValueId = handleMemberExpression(scopeTranslator, callExpression.callee);
      if (callExpression.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
        throw new Error(
          `Unhandled method call ${JSON.stringify(getLocation(callExpression.callee.property))}`,
        );
      }
      simpleName = callExpression.callee.property.name;
      break;
    case TSESTree.AST_NODE_TYPES.Identifier:
      simpleName = callExpression.callee.name;
      break;
    default:
      throw new Error(`Unsupported call expression callee ${callExpression.callee.type}`);
  }
  const resultValueId = scopeTranslator.getNewValueId();
  let args: number[] = [];
  if (calleeValueId) {
    args = [calleeValueId];
  }
  scopeTranslator.addCallExpression(
    getLocation(callExpression),
    resultValueId,
    new FunctionId({ simpleName }),
    args,
  );
  return resultValueId;
}
