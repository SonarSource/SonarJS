import type { Block } from './block';
import type { FunctionDefinition } from './function-definition';
import type { Parameter, PositionalParameter } from './values/parameter';
import type { FunctionReference } from './values/function-reference';

export type FunctionInfo = {
  readonly blocks: Array<Block>;
  readonly fileName: string;
  readonly definition: FunctionDefinition;
  readonly functionReferences: Array<FunctionReference>;
  readonly parameters: Array<Parameter>;
  readonly positionalParameters: Array<PositionalParameter>;
};

export const createFunctionInfo = (
  fileName: string,
  definition: FunctionDefinition,
  parameters: Array<Parameter>,
  positionalParameters: Array<PositionalParameter> = [],
): FunctionInfo => {
  return {
    definition,
    blocks: [],
    fileName,
    functionReferences: [],
    parameters,
    positionalParameters,
  };
};
