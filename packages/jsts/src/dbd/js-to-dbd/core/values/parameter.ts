import type { TypeInfo } from '../type-info';
import { type BaseValue, createValue } from '../value';
import type { Location } from '../location';

export type Parameter = BaseValue<'parameter'> & {
  readonly location: Location;
  readonly name: string;
  readonly typeInfo: TypeInfo;
};

export type PositionalParameter = {
  readonly location: Location;
  readonly name: string;
  readonly position: number;
};

export const createParameter = (
  identifier: number,
  name: string,
  location: Location,
): Parameter => {
  return {
    ...createValue('parameter', identifier),
    location,
    name,
    typeInfo: {
      kind: 'PRIMITIVE',
      qualifiedName: 'int',
      hasIncompleteSemantics: false,
    },
  };
};

export const isAParameter = (value: BaseValue<any>): value is Parameter => {
  return (value as Parameter).type === 'parameter';
};
