import { type Value } from '../value';
import type { Location } from '../location';
import { type BaseInstruction, createInstruction } from '../instruction';
import type { CallInstruction } from './call-instruction';
import type { PhiInstruction } from './phi-instruction';
import { TypeInfo } from '../type-info';

export type ValueInstructionType = 'call' | 'phi';

export type BaseValueInstruction<Type extends ValueInstructionType> = BaseInstruction<
  Type,
  Array<Value>
> & {
  readonly valueIndex: number;
  readonly variableName: string | null;
  readonly staticType: TypeInfo | undefined;
};

export type ValueInstruction = CallInstruction | PhiInstruction;

export const createValueInstruction = <Type extends ValueInstructionType>(
  instructionType: Type,
  valueIndex: number,
  variableName: string | null,
  operands: Array<Value>,
  location: Location,
  staticType: TypeInfo | undefined,
): BaseValueInstruction<Type> => {
  return {
    ...createInstruction(instructionType, operands, location),
    valueIndex,
    variableName,
    staticType,
  };
};