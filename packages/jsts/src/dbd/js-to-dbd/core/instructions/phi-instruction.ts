import { type BaseValueInstruction, createValueInstruction } from './value-instruction';
import type { Location } from '../location';
import type { Value } from '../value';
import type { Block } from '../block';
import { TypeInfo } from '../type-info';

export type PhiInstruction = BaseValueInstruction<'phi'> & {
  valuesByBlock: Map<Block, Value>;
};

export const createPhiInstruction = (
  targetValue: Value,
  variableName: string | null,
  valuesByBlock: Map<Block, Value>,
  location: Location,
  staticType: TypeInfo | undefined = undefined,
): PhiInstruction => {
  return {
    ...createValueInstruction(
      'phi',
      targetValue.identifier,
      variableName,
      [],
      location,
      staticType,
    ),
    valuesByBlock,
  };
};
