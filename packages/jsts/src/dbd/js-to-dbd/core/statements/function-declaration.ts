import type { StatementHandler } from '../statement-handler';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { createFunctionReference } from '../values/function-reference';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
} from '../function-definition';
import { createReference } from '../values/reference';

export const handleFunctionDeclaration: StatementHandler<TSESTree.FunctionDeclarationWithName> = (
  node,
  context,
) => {
  const { id } = node;
  const {
    addInstructions,
    scopeManager,
    functionInfo: currentFunctionInfo,
    processFunction,
  } = context;
  const { createValueIdentifier } = scopeManager;
  const { name } = id;

  const currentScope = context.scopeManager.getScope(node);
  const currentScopeId = context.scopeManager.getScopeId(currentScope);

  const functionReferenceIdentifier = createValueIdentifier();
  // todo: we may need a common helper
  let functionName;
  if (currentFunctionInfo.definition.name === 'main') {
    functionName = name;
  } else {
    functionName = `${currentFunctionInfo.definition.name}__${functionReferenceIdentifier}`;
  }
  const functionInfo = processFunction(functionName, node);
  const functionReference = createFunctionReference(functionReferenceIdentifier, functionInfo);

  currentFunctionInfo.functionReferences.push(functionReference);

  // create the function object
  addInstructions([
    createCallInstruction(
      functionReferenceIdentifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
    createCallInstruction(
      createValueIdentifier(),
      null,
      createSetFieldFunctionDefinition(name),
      [createReference(currentScopeId), functionReference],
      node.loc,
    ),
  ]);
};
