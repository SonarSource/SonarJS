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
import type { FunctionReference } from './values/function-reference';
import { Context } from './context';
import { createParameter, Parameter } from './values/parameter';

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

export const getParameter = (
  context: Context,
  functionInfo: FunctionInfo,
  name: string,
): Parameter | null => {
  // replace lookup with eslint/escope find
  const parameter = functionInfo.positionalParameters.find(parameter => parameter.name === name);
  if (!parameter) {
    return null;
  }
  const { position, location } = parameter;
  const resultParam = createParameter(context.scopeManager.createValueIdentifier(), name, location);
  context.addInstructions([
    createCallInstruction(
      resultParam.identifier,
      null,
      createGetFieldFunctionDefinition(String(position)),
      [functionInfo.parameters[1]],
      location,
    ),
  ]);
  return resultParam;
};
