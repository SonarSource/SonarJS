import type {TerminatorInstruction} from "./instructions/terminator-instruction";
import type {ValueInstruction} from "./instructions/value-instruction";
import type {Location} from "./location";
import type {Value} from "./value";

export type Instruction =
  | TerminatorInstruction
  | ValueInstruction
  ;

export type BaseInstruction<
  Type extends string,
  Operands extends Array<Value>
> = {
  type: Type;
  location: Location;
  operands: Operands;
};

export const createInstruction = <
  Type extends string,
  Operands extends Array<Value>
>(
  type: Type,
  operands: Operands,
  location: Location,
): BaseInstruction<Type, Operands> => {
  return {
    type,
    location,
    operands
  };
};