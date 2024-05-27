import type { Scope } from './scope';
import type { Location } from './location';
import { CallInstruction, createCallInstruction } from './instructions/call-instruction';
import { createNewObjectFunctionDefinition } from './function-definition';
import type { Block } from './block';
import { isATerminatorInstruction } from './instructions/terminator-instruction';
import type { Instruction } from './instruction';
import { toUnixPath } from '@sonar/shared';

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

export function getSignaturePrefix(rootPath: string, filePath: string): string {
  const relativeFilename =
    rootPath && filePath.startsWith(rootPath) ? filePath.slice(rootPath.length + 1) : filePath;
  return toUnixPath(relativeFilename).replace(/[/\s]+/g, '_');
}

export function getSignature(rootPath: string, filePath: string, simpleName: string): string {
  return `${getSignaturePrefix(rootPath, filePath)}.${simpleName}`;
}
