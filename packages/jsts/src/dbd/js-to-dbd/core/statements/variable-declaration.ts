import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Value } from '../value';
import { handleExpression } from '../expressions';
import { createNull } from '../values/null';
import { createAssignment, createVariable } from '../variable';
import { createCallInstruction } from '../instructions/call-instruction';
import { createSetFieldFunctionDefinition } from '../function-definition';
import { createReference } from '../values/reference';
import { ContextManager } from '../context-manager';

export function handleVariableDeclaration(
  context: ContextManager,
  node: TSESTree.VariableDeclaration,
) {
  if (node.declarations.length !== 1) {
    throw new Error(`Unable to handle declaration with ${node.declarations.length} declarations`);
  }
  const declarator = node.declarations[0];
  if (!declarator || declarator.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator) {
    throw new Error('Unhandled declaration');
  }
  if (declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier) {
    throw new Error(`Unhandled declaration id type ${declarator.id.type}`);
  }
  const variableName = declarator.id.name;
  const currentBlock = context.block.getCurrentBlock();

  let value: Value;

  if (declarator.init) {
    const result = handleExpression(context, declarator.init);

    value = result.value;

    currentBlock.instructions.push(...result.instructions);
  } else {
    value = createNull();
  }

  const currentScope = currentBlock.scope;
  const referenceIdentifier = context.scope.createValueIdentifier();

  // add the variable to the scope
  const variable = createVariable(variableName);

  currentScope.variables.set(variableName, variable);

  // create the assignment
  currentScope.assignments.set(variableName, createAssignment(referenceIdentifier, variable));

  // todo: createScopeAssignmentInstruction...
  const instruction = createCallInstruction(
    referenceIdentifier,
    null,
    createSetFieldFunctionDefinition(variableName),
    [createReference(currentScope.identifier), value],
    node.loc,
  );

  currentBlock.instructions.push(instruction);
}
