import { type BaseValue, createValue } from '../value';

export type Reference = BaseValue<'reference'>;

export const createReference = (identifier: number): Reference => {
  return {
    ...createValue('reference', identifier),
  };
};
