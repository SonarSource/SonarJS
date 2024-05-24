import type { Block } from '../block';
import {
  type BaseTerminatorInstruction,
  createTerminatorInstruction,
} from './terminator-instruction';
import type { Location } from '../location';

export type BranchingInstruction = BaseTerminatorInstruction<'branching', []> & {
  destination: Block;
};

export const createBranchingInstruction = (
  destination: Block,
  location: Location,
): BranchingInstruction => {
  return {
    ...createTerminatorInstruction('branching', [], location),
    destination,
  };
};
