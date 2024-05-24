import type { TypeInfo } from '../type-info';
import { type BaseValue, createValue } from '../value';

export type Constant = BaseValue<'constant'> & {
  readonly value: bigint | boolean | null | number | RegExp | string | undefined;
  readonly typeInfo: TypeInfo;
};

export const createConstant = (identifier: number, value: Constant['value']): Constant => {
  return {
    ...createValue(identifier, 'constant'),
    typeInfo: {
      kind: 'PRIMITIVE',
      qualifiedName: typeof value,
      hasIncompleteSemantics: true,
    },
    value,
  };
};
