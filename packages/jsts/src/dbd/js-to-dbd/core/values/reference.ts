import type { BaseValue } from '../value';

export type Reference = BaseValue<'reference'>;

export const createReference = (identifier: number): Reference => {
  return {
    identifier,
    type: 'reference',
    users: [],
  };
};
