import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createGetFieldFunctionDefinition } from '../function-definition';
import { createNull } from '../values/null';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleMemberExpression: ExpressionHandler<TSESTree.MemberExpression> = (
  context,
  node,
) => {
  const { object, property } = node;
  const instructions: Array<Instruction> = [];

  let memberValue: Value;
  let objectValue: Value | null = null;

  if (object.type === AST_NODE_TYPES.Identifier) {
    const variableName = object.name;
    const variableAndOwner = context.scope.getVariableAndOwner(variableName);

    if (variableAndOwner) {
      const { variable, owner } = variableAndOwner;
      const assignment = context.scope.getAssignment(variable);

      if (assignment) {
        const objectValueIdentifier = context.scope.createValueIdentifier();

        objectValue = createReference(objectValueIdentifier);

        instructions.push(
          createCallInstruction(
            objectValueIdentifier,
            null,
            createGetFieldFunctionDefinition(variable.name),
            [createReference(owner.identifier)],
            node.loc,
          ),
        );
      }
    }

    if (objectValue === null) {
      objectValue = createNull();
    }
  } else {
    const compilationResult = handleExpression(context, object);

    instructions.push(...compilationResult.instructions);

    objectValue = compilationResult.value;
  }

  if (property.type === AST_NODE_TYPES.Identifier) {
    const memberValueIdentifier = context.scope.createValueIdentifier();

    instructions.push(
      createCallInstruction(
        memberValueIdentifier,
        null,
        createGetFieldFunctionDefinition(property.name),
        [objectValue],
        node.loc,
      ),
    );

    memberValue = createReference(memberValueIdentifier);
  } else {
    console.error(`Unable to handle object property type ${property.type}`);

    return {
      instructions: [],
      value: createNull(),
    };
  }

  const { instructions: propertyInstructions } = handleExpression(context, property);

  return {
    instructions: [...instructions, ...propertyInstructions],
    value: memberValue,
  };
};
