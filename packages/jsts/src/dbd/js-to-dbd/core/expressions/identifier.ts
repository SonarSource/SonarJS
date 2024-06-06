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
import { Scope } from '@typescript-eslint/utils/ts-eslint';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (node, context) => {
  let value: BaseValue<any>;

  const currentScope = context.scopeManager.getScope(node);
  if (context.scopeManager.isParameter(node)) {
    return getParameter(context, node);
  }
  const identifierReference = context.scopeManager.getIdentifierReference(node);

  if (identifierReference.base === unresolvable) {
    value = createReference(context.scopeManager.createValueIdentifier());

    context.addInstructions([
      createCallInstruction(
        value.identifier,
        null,
        createIdentityFunctionDefinition(),
        [createNull()],
        node.loc,
      ),
    ]);
  } else {
    let scopePointer: Scope.Scope | null = currentScope;
    while (scopePointer !== null && identifierReference.variable.scope !== scopePointer) {
      context.addInstructions([
        createCallInstruction(
          context.scopeManager.getScopeId(scopePointer.upper!),
          null,
          createGetFieldFunctionDefinition('@parent'),
          [createReference(context.scopeManager.getScopeId(scopePointer))],
          node.loc,
        ),
      ]);
      scopePointer = scopePointer.upper;
    }

    value = identifierReference.base;

    context.addInstructions([
      createCallInstruction(
        value.identifier,
        null,
        createGetFieldFunctionDefinition(node.name),
        [createReference(context.scopeManager.getScopeId(identifierReference.variable.scope))],
        node.loc,
      ),
    ]);
  }

  return value;
};
