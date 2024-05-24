import type { FunctionDefinition } from '../function-definition';
import type { TypeInfo } from '../type-info';
import type { Value } from '../value';
import { createValueInstruction, type BaseValueInstruction } from './value-instruction';
import type { Location } from '../location';

export type CallInstruction = BaseValueInstruction<'call'> & {
  readonly functionDefinition: FunctionDefinition;
  readonly isInstanceMethodCall: boolean;
  readonly staticType: TypeInfo;
};

export const createCallInstruction = (
  valueIndex: number,
  variableName: string | null,
  functionDefinition: FunctionDefinition,
  operands: Array<Value>,
  location: Location,
): CallInstruction => {
  return {
    ...createValueInstruction('call', valueIndex, variableName, operands, location),
    functionDefinition,
    isInstanceMethodCall: false,
    staticType: {
      kind: 0,
      qualifiedName: 'foo',
      hasIncompleteSemantics: false,
    },
  };
};
