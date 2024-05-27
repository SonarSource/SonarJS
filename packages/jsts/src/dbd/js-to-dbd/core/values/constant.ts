import { createTypeInfo } from '../type-info';
import { type BaseValue, createValue } from '../value';

export type Constant = BaseValue<'constant'> & {
  readonly value: bigint | boolean | null | number | RegExp | string | undefined;
};

export const createConstant = (identifier: number, value: Constant['value']): Constant => {
  return {
    ...createValue(identifier, 'constant', createTypeInfo('PRIMITIVE', typeof value, true)),
    value,
  };
};
