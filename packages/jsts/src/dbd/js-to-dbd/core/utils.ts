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
import { TSESTree } from '@typescript-eslint/typescript-estree';

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

export const getParameter = (context: Context, node: TSESTree.Identifier): Parameter => {
  const definition = context.scopeManager.getDefinitionFromIdentifier(node)?.name;
  if (definition?.type !== 'Identifier') {
    console.error("Definitions with type different than 'Identifier' are not supported");
    throw new Error("Definitions with type different than 'Identifier' are not supported");
  }
  const { loc: location } = definition;
  const position = (node.parent as TSESTree.FunctionDeclaration).params.indexOf(node);
  const resultParam = createParameter(
    context.scopeManager.createValueIdentifier(),
    node.name,
    location,
  );
  context.addInstructions([
    createCallInstruction(
      resultParam.identifier,
      null,
      createGetFieldFunctionDefinition(String(position)),
      [context.functionInfo.parameters[1]],
      location,
    ),
  ]);
  return resultParam;
};
