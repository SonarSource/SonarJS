import { type BaseValue, createValue } from '../value';

export type Reference = BaseValue<'reference'>;

export const createReference = (identifier: number): Reference => {
  return {
    ...createValue('reference', identifier),
  };
};

/**
 * @todo Rename this to something meaningful
 */
export const createReference2 = (identifier: number, value: BaseValue<any>): BaseValue<any> => {
  return {
    ...value,
    identifier,
  };
};
