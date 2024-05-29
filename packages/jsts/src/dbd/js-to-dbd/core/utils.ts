import type { Scope } from './scope';
import type { Location } from './location';
import { CallInstruction, createCallInstruction } from './instructions/call-instruction';
import { createNewObjectFunctionDefinition } from './function-definition';
import type { Block } from './block';
import { isATerminatorInstruction } from './instructions/terminator-instruction';
import type { Instruction } from './instruction';
import type { Parameter } from './values/parameter';
import type { FunctionInfo } from './function-info';
import type { FunctionReference } from './values/function-reference';

export function createScopeDeclarationInstruction(
  scope: Scope,
  location: Location,
): CallInstruction {
  return createCallInstruction(
    scope.identifier,
    null,
    createNewObjectFunctionDefinition(),
    [],
    location,
  );
}

export function isTerminated(block: Block): boolean {
  const lastInstruction = getBlockLastInstruction(block);

  return lastInstruction !== null && isATerminatorInstruction(lastInstruction);
}

function getBlockLastInstruction(block: Block): Instruction | null {
  const { instructions } = block;

  return instructions.length > 0 ? instructions[instructions.length - 1] : null;
}

export const getFunctionReference = (
  functionInfo: FunctionInfo,
  identifier: number,
): FunctionReference | null => {
  return (
    functionInfo.functionReferences.find(functionReference => {
      return functionReference.identifier === identifier;
    }) || null
  );
};

export const getParameter = (functionInfo: FunctionInfo, name: string): Parameter | null => {
  return (
    functionInfo.parameters.find(parameter => {
      return parameter.name === name;
    }) || null
  );
};
