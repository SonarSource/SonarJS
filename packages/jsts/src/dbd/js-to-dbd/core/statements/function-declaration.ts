import type { StatementHandler } from '../statement-handler';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { createAssignment, createVariable } from '../variable';
import { createFunctionInfo } from '../function-info';
import { createParameter } from '../values/parameter';
import { createFunctionReference } from '../values/function-reference';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createFunctionDefinition,
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
  generateSignature,
} from '../function-definition';
import { createConstant } from '../values/constant';
import { createReference } from '../values/reference';

export const handleFunctionDeclaration: StatementHandler<TSESTree.FunctionDeclarationWithName> = (
  node,
  context,
  fileName,
) => {
  const { id } = node;
  const { scopeManager } = context;
  const {
    getCurrentBlock,
    getCurrentFunctionInfo,
    processFunctionInfo,
    createValueIdentifier,
    getCurrentScopeIdentifier,
    addVariable,
    addAssignment,
  } = scopeManager;

  const { name } = id;

  // a function declaration is a variable declaration and an assignment in the current scope
  // todo: should be in the ***passed*** scope
  const variable = createVariable(name);

  addVariable(variable);

  const functionInfo = createFunctionInfo(
    fileName,
    createFunctionDefinition(name, generateSignature(name, fileName)),
    node.params.map(parameter => {
      // todo: make a helper, it is duplicated in ArrowFunctionExpression handler
      let parameterName: string;

      if (parameter.type === AST_NODE_TYPES.Identifier) {
        parameterName = parameter.name;
      } else {
        // todo
        parameterName = '';
      }

      return createParameter(createValueIdentifier(), parameterName, parameter.loc);
    }),
    [],
  );

  const functionReference = createFunctionReference(functionInfo, createValueIdentifier(), id.name);

  getCurrentFunctionInfo().functionReferences.push(functionReference);

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

  processFunctionInfo(functionInfo, node.body.body, node.loc);
};
