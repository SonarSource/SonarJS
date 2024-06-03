import { type BaseValue, createValue } from '../value';

export type Reference = BaseValue<'reference'>;

export const createReference = (identifier: number): Reference => {
  return {
    ...createValue('reference', identifier),
  };
};

export const createReference2 = (identifier: number, value: BaseValue<any>): BaseValue<any> => {
  return {
    ...value,
    identifier,
  };
};
