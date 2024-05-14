import { TSESTree } from '@typescript-eslint/utils';
import { getLocation } from '../utils';
import { ScopeTranslator } from '../scope-translator';
import { handleLiteralWithoutCall } from '../expressions/literal';

export function handleReturnStatement(
  scopeTranslator: ScopeTranslator,
  returnStatement: TSESTree.ReturnStatement,
) {
  if (returnStatement.argument === null) {
    return scopeTranslator.addNullReturn(getLocation(returnStatement));
  } else if (returnStatement.argument.type !== TSESTree.AST_NODE_TYPES.Literal) {
    throw new Error(`Unhandled return statement argument type ${returnStatement.argument.type}`);
  } else {
    const returnValue = handleLiteralWithoutCall(scopeTranslator, returnStatement.argument);
    return scopeTranslator.addReturnInstruction(getLocation(returnStatement), returnValue);
  }
}
