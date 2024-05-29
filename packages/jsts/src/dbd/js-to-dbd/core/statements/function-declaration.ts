import type { StatementHandler } from '../statement-handler';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { createAssignment, createVariable } from '../variable';
import { createFunctionReference } from '../values/function-reference';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
} from '../function-definition';
import { createConstant } from '../values/constant';
import { createReference } from '../values/reference';

export const handleFunctionDeclaration: StatementHandler<TSESTree.FunctionDeclarationWithName> = (
  node,
  context,
) => {
  const { id } = node;
  const { blockManager, scopeManager, functionInfo: currentFunctionInfo } = context;
  const {
    processFunctionInfo,
    createValueIdentifier,
    getCurrentScopeIdentifier,
    addVariable,
    addAssignment,
  } = scopeManager;
  const { getCurrentBlock } = blockManager;

  const { name } = id;

  // a function declaration is a variable declaration and an assignment in the current scope
  // todo: should be in the ***passed*** scope
  const variable = createVariable(name);

  addVariable(variable);

  const functionReferenceIdentifier = createValueIdentifier();
  // todo: we may need a common helper
  const functionName = `${currentFunctionInfo.definition.name}__${functionReferenceIdentifier}`;

  const functionInfo = processFunctionInfo(functionName, node.body.body, node.params, node.loc);

  const functionReference = createFunctionReference(functionInfo, functionReferenceIdentifier);

  currentFunctionInfo.functionReferences.push(functionReference);

  // create the function object
  getCurrentBlock().instructions.push(
    createCallInstruction(
      functionReference.identifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
  );

  for (const attributeName of ['bind', 'call']) {
    getCurrentBlock().instructions.push(
      createCallInstruction(
        createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition(attributeName),
        [
          functionReference,
          createConstant(createValueIdentifier(), attributeName), // todo: we need DBD to understand function reference
        ],
        node.loc,
      ),
    );
  }

  getCurrentBlock().instructions.push(
    createCallInstruction(
      createValueIdentifier(),
      null,
      createSetFieldFunctionDefinition(variable.name),
      [createReference(getCurrentScopeIdentifier()), functionReference],
      node.loc,
    ),
  );

  const assignment = createAssignment(functionReference.identifier, variable);

  addAssignment(id.name, assignment);
};
