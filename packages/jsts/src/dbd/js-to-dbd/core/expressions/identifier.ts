import { type ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createGetFieldFunctionDefinition,
  createIdentityFunctionDefinition,
} from '../function-definition';
import { createReference } from '../values/reference';
import { createNull } from '../values/constant';
import { type BaseValue } from '../value';
import { getParameter } from '../utils';
import { unresolvable } from '../scope-manager';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (node, functionInfo) => {
  let value: BaseValue<any>;

  if (functionInfo.scopeManager.isParameter(node)) {
    return getParameter(functionInfo, node);
  }
  const identifierReference = functionInfo.scopeManager.getIdentifierReference(node);

  if (identifierReference.base === unresolvable) {
    value = createReference(functionInfo.scopeManager.createValueIdentifier());

    functionInfo.addInstructions([
      createCallInstruction(
        value.identifier,
        null,
        createIdentityFunctionDefinition(),
        [createNull()],
        node.loc,
      ),
    ]);
  } else {
    value = identifierReference.base;
    functionInfo.addInstructions([
      createCallInstruction(
        value.identifier,
        null,
        createGetFieldFunctionDefinition(node.name),
        [createReference(functionInfo.scopeManager.getScopeId(identifierReference.variable.scope))],
        node.loc,
      ),
    ]);
  }

  return value;
};
