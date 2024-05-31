import type { TypeInfo } from '../type-info';
import { type BaseValue, createValue } from '../value';
import { createReference, type Reference } from './reference';

export type Constant = BaseValue<'constant'> & {
  readonly value: bigint | boolean | null | number | RegExp | string | undefined;
  readonly typeInfo: TypeInfo;
};

export const createConstant = (identifier: number, value: Constant['value']): Constant => {
  return {
    ...createValue('constant', identifier),
    typeInfo: {
      kind: 'PRIMITIVE',
      qualifiedName: 'int',
      hasIncompleteSemantics: true,
    },
    value,
  };
};

// todo: move to reference module
export const createNull = (): Reference => {
  return createReference(-1);
};

export const isAConstant = (value: BaseValue<any>): value is Constant => {
  return (value as Constant).type === 'constant';
};
