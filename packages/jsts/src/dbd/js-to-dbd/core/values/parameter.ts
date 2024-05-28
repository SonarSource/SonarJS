import type { TypeInfo } from '../type-info';
import { type BaseValue, createValue } from '../value';
import type { Location } from '../location';

export type Parameter = BaseValue<'parameter'> & {
  readonly location: Location;
  readonly name: string;
  readonly typeInfo: TypeInfo;
};

export const createParameter = (
  identifier: number,
  name: string,
  location: Location,
): Parameter => {
  return {
    ...createValue(identifier, 'parameter'),
    location,
    name,
    typeInfo: {
      kind: 'PRIMITIVE',
      qualifiedName: 'int',
      hasIncompleteSemantics: false,
    },
  };
};
