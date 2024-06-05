import type { StatementHandler } from '../statement-handler';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { createVariable } from '../variable';
import { createFunctionReference } from '../values/function-reference';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
} from '../function-definition';
import { putValue, ReferenceRecord } from '../ecma/reference-record';
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

  // a function declaration is a variable declaration and an assignment in the current scope
  // todo: should be in the ***passed*** scope?
  const variable = createVariable(name);
  const currentEnvironmentRecord = context.scopeManager.getCurrentEnvironmentRecord();

  const functionReferenceIdentifier = createValueIdentifier();
  // todo: we may need a common helper
  let functionName;
  if (currentFunctionInfo.definition.name === 'main') {
    functionName = name;
  } else {
    functionName = `${currentFunctionInfo.definition.name}__${functionReferenceIdentifier}`;
  }
  const functionInfo = processFunction(functionName, node.body.body, node.params, node.loc);
  const functionReference = createFunctionReference(functionReferenceIdentifier, functionInfo);

  const referenceIdentifier: ReferenceRecord = {
    referencedName: functionName,
    base: currentEnvironmentRecord,
    strict: true,
  };
  putValue(referenceIdentifier, functionReference);

  currentFunctionInfo.functionReferences.push(functionReference);

  // create the function object
  addInstructions([
    createCallInstruction(
      functionReference.identifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
    createCallInstruction(
      createValueIdentifier(),
      null,
      createSetFieldFunctionDefinition(variable.name),
      [createReference(scopeManager.getCurrentEnvironmentRecord().identifier), functionReference],
      node.loc,
    ),
  ]);
};
