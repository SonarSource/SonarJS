import {type BaseInstruction, createInstruction, type Instruction} from "../instruction";
import type {Location} from "../location";
import type {BranchingInstruction} from "./branching-instruction";
import type {ConditionalBranchingInstruction} from "./conditional-branching-instruction";
import type {ReturnInstruction} from "./return-instruction";
import type {Value} from "../value";

const terminatorInstructionTypes = [
  "branching",
  "conditional_branching",
  "return"
] as const;

export type TerminatorInstructionType = typeof terminatorInstructionTypes[number];

export type BaseTerminatorInstruction<
  Type extends TerminatorInstructionType,
  Operands extends Array<Value>
> = BaseInstruction<Type, Operands>;

export type TerminatorInstruction =
  | BranchingInstruction
  | ConditionalBranchingInstruction
  | ReturnInstruction;

export const createTerminatorInstruction = <
  Type extends TerminatorInstructionType,
  Operands extends Array<Value>
>(
  instructionType: Type,
  operands: Operands,
  location: Location,
): BaseTerminatorInstruction<Type, Operands> => {
  return {
    ...createInstruction(instructionType, operands, location)
  };
};

export const isATerminatorInstruction = (instruction: Instruction): instruction is TerminatorInstruction => {
  return terminatorInstructionTypes.includes((instruction as TerminatorInstruction).type);
};