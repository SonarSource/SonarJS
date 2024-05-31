import type { TypeInfo } from '../type-info';
import { type BaseValue, createValue } from '../value';

export type TypeName = BaseValue<'type_name'> & {
  readonly name: string;
};

export const createTypeName = (identifier: number, name: string, typeInfo: TypeInfo): TypeName => {
  return {
    ...createValue('type_name', identifier, typeInfo),
    name,
  };
};
