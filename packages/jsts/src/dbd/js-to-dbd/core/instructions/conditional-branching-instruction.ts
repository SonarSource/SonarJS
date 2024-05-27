import type { Block } from '../block';
import {
  type BaseTerminatorInstruction,
  createTerminatorInstruction,
} from './terminator-instruction';
import type { Value } from '../value';
import type { Location } from '../location';

export type ConditionalBranchingInstruction = BaseTerminatorInstruction<
  'conditional_branching',
  [Value]
> & {
  readonly consequentBlock: Block;
  readonly alternateBlock: Block;
};

export const createConditionalBranchingInstruction = (
  condition: Value,
  consequentBlock: Block,
  alternateBlock: Block,
  location: Location,
): ConditionalBranchingInstruction => {
  const terminatorInstruction = createTerminatorInstruction<'conditional_branching', [Value]>(
    'conditional_branching',
    [condition],
    location,
  );

  return {
    ...terminatorInstruction,
    consequentBlock,
    alternateBlock,
  };
};
