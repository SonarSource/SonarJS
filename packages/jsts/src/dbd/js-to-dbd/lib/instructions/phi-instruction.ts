import {type BaseValueInstruction, createValueInstruction} from "./value-instruction";
import type {Location} from "../location";
import type {Value} from "../value";
import type {Block} from "../block";

export type PhiInstruction = BaseValueInstruction<"phi"> & {
  valuesByBlock: Map<Block, Value>;
};

export const createPhiInstruction = (
  targetValue: Value,
  variableName: string | null,
  valuesByBlock: Map<Block, Value>,
  location: Location
): PhiInstruction => {
  return {
    ...createValueInstruction(
      "phi",
      targetValue.identifier,
      variableName,
      [],
      location,
    ),
    valuesByBlock
  };
};