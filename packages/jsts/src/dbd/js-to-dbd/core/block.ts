import type { Instruction } from './instruction';
import type { Location } from './location';
import type { EnvironmentRecord } from './ecma/environment-record';

export type Block = {
  readonly exceptionHandler?: Block;
  readonly identifier: number;
  readonly instructions: Array<Instruction>;
  readonly isLoopCondition: boolean; // todo: what is this?
  readonly location: Location;
  readonly loopId: number | null;
  readonly parentLoopId: number | null;
  readonly environmentRecord: EnvironmentRecord;
};

export const createBlock = (
  environmentRecord: EnvironmentRecord,
  identifier: number,
  location: Location,
): Block => {
  return {
    exceptionHandler: undefined,
    identifier,
    instructions: [],
    isLoopCondition: false,
    location,
    loopId: null,
    parentLoopId: null,
    environmentRecord,
  };
};
