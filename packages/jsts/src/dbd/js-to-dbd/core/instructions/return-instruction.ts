import {
  createTerminatorInstruction,
  type BaseTerminatorInstruction,
} from './terminator-instruction';
import type { Location } from '../location';
import type { Value } from '../value';

/**
 * A return instruction
 */
export type ReturnInstruction = BaseTerminatorInstruction<'return', [Value]> & {};

export const createReturnInstruction = (
  returnValue: Value,
  location: Location,
): ReturnInstruction => {
  return createTerminatorInstruction<'return', [Value]>('return', [returnValue], location);
};
