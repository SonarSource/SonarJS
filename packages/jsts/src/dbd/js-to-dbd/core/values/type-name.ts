import type { TypeInfo } from '../type-info';
import { type BaseValue } from '../value';

export type TypeName = BaseValue<'type_name'> & {
  readonly name: string;
  readonly typeInfo: TypeInfo;
};
