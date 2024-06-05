import type { Instruction } from './instruction';
import type { Location } from './location';

export type Block = {
  readonly exceptionHandler?: Block;
  readonly identifier: number;
  readonly instructions: Array<Instruction>;
  readonly isLoopCondition: boolean; // todo: what is this?
  readonly location: Location;
  readonly loopId: number | null;
  readonly parentLoopId: number | null;
};

export const createBlock = (identifier: number, location: Location): Block => {
  return {
    exceptionHandler: undefined,
    identifier,
    instructions: [],
    isLoopCondition: false,
    location,
    loopId: null,
    parentLoopId: null,
  };
};
