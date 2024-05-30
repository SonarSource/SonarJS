import { createNull, createReference } from '../values/reference';
import { TSESTree } from '@typescript-eslint/utils';
import type { ExpressionHandler } from '../expression-handler';
import { createGetFieldFunctionDefinition } from '../function-definition';
import type { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import { getParameter } from '../utils';
import type { Value } from '../value';
import type { Assignment } from '../variable';
import type { Scope } from '../scope';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (
  node,
  context,
  scopeReference,
) => {
  const { name } = node;
  const { functionInfo, scopeManager } = context;
  const { createValueIdentifier, getCurrentScopeIdentifier } = scopeManager;

  console.log('IDENTIFIER', name);

  const instructions: Array<Instruction> = [];

  // @ts-ignore
  let operand: Value | null = null;
  // let variableAndOwner = scopeManager.getVariableAndOwner(name, scopeReference);
  //
  // if (variableAndOwner) {
  //   const assignment = scopeManager.getAssignment(variableAndOwner.variable, scopeReference);
  //
  //   if (assignment) {
  //     return {
  //       instructions,
  //       value: createReference(assignment.identifier),
  //     };
  //   } else {
  //     // todo: should we resolve to null?
  //   }
  // }

  let assignment: Assignment | undefined;
  let scope: Scope | null = null;

  // an identifier can reference a parameter or the parent scope *only* if the passed scope is the current scope
  if (scopeReference.identifier === getCurrentScopeIdentifier()) {
    console.log(name, 'CHALLENGE PARAMETERS');

    const parameter = getParameter(functionInfo, node.name);

    if (parameter) {
      console.log(name, 'IS A PARAMETER');

      return {
        instructions,
        value: parameter,
      };
    } else {
      // let's look up the scope stack until we find the symbol...or not
      let distance = 0;

      const { scopes } = scopeManager;

      const lookUp = () => {
        if (scopes.length > distance) {
          scope = scopes[distance];
          assignment = scope.assignments.get(name);

          console.log('assignment', distance, assignment, scope.identifier);

          if (!assignment) {
            distance++;

            lookUp();
          }
        }
      };

      lookUp();

      let lastValue: Value = createReference(getCurrentScopeIdentifier());

      for (let i = 0; i < distance; i++) {
        const operand = lastValue;

        lastValue = createReference(createValueIdentifier());

        instructions.push(
          createCallInstruction(
            lastValue.identifier,
            null,
            createGetFieldFunctionDefinition('@parent'),
            [operand],
            node.loc,
          ),
        );
      }

      operand = lastValue;
    }
  }

  // we return the last assignment
  if (assignment) {
    return {
      instructions,
      value: createReference(assignment.identifier),
    };
  }

  return {
    instructions,
    value: createNull(),
  };
};
