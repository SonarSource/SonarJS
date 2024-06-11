import type { Location } from './location';
import { CallInstruction, createCallInstruction } from './instructions/call-instruction';
import {
  createGetFieldFunctionDefinition,
  createNewObjectFunctionDefinition,
} from './function-definition';
import type { Block } from './block';
import { isATerminatorInstruction } from './instructions/terminator-instruction';
import type { Instruction } from './instruction';
import type { FunctionInfo } from './function-info';
import { createParameter, Parameter } from './values/parameter';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { Scope } from '@typescript-eslint/utils/ts-eslint';

export function createScopeDeclarationInstruction(
  scopeId: number,
  location: Location,
): CallInstruction {
  return createCallInstruction(scopeId, null, createNewObjectFunctionDefinition(), [], location);
}

export function isTerminated(block: Block): boolean {
  const lastInstruction = getBlockLastInstruction(block);

  return lastInstruction !== null && isATerminatorInstruction(lastInstruction);
}

function getBlockLastInstruction(block: Block): Instruction | null {
  const { instructions } = block;

  return instructions.length > 0 ? instructions[instructions.length - 1] : null;
}

export function getParameterField(position: number) {
  return `param${position}`;
}

export const getParameter = (functionInfo: FunctionInfo, node: TSESTree.Identifier): Parameter => {
  const definition = functionInfo.scopeManager.getDefinitionFromIdentifier(node)?.name;
  if (definition?.type !== 'Identifier') {
    console.error("Definitions with type different than 'Identifier' are not supported");
    throw new Error("Definitions with type different than 'Identifier' are not supported");
  }
  const { loc: location } = definition;
  let scope: Scope.Scope = functionInfo.scopeManager.getScope(node);
  while (scope.type !== Scope.ScopeType.function && scope.upper) {
    scope = scope.upper;
  }
  const variable = functionInfo.scopeManager.getVariableFromIdentifier(node);
  const position = (scope.block as TSESTree.FunctionDeclaration).params.findIndex(
    parameter =>
      parameter.type === AST_NODE_TYPES.Identifier &&
      variable === functionInfo.scopeManager.getVariableFromIdentifier(parameter),
  );
  const resultParam = createParameter(
    functionInfo.scopeManager.createValueIdentifier(),
    node.name,
    location,
  );
  functionInfo.addInstructions([
    createCallInstruction(
      resultParam.identifier,
      null,
      createGetFieldFunctionDefinition(getParameterField(position)),
      [functionInfo.parameters[1]],
      location,
    ),
  ]);
  return resultParam;
};
