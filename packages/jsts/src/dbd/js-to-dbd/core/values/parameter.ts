import { type BaseValue, createValue } from '../value';
import type { Location } from '../location';

export type Parameter = BaseValue<'parameter'> & {
  readonly location: Location;
  readonly name: string;
};
export const createParameter = (
  identifier: number,
  name: string,
  location: Location,
): Parameter => {
  return {
    ...createValue(identifier, 'parameter'),
    name,
    location,
  };
};
