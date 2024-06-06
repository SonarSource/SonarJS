import type { Block } from './block';
import type { FunctionDefinition } from './function-definition';
import type { Parameter } from './values/parameter';
import type { FunctionReference } from './values/function-reference';

export type FunctionInfo = {
  readonly blocks: Array<Block>;
  readonly fileName: string;
  readonly definition: FunctionDefinition;
  readonly functionReferences: Array<FunctionReference>;
  readonly parameters: Array<Parameter>;
};

export const createFunctionInfo = (
  fileName: string,
  definition: FunctionDefinition,
  parameters: Array<Parameter>,
): FunctionInfo => {
  return {
    definition,
    blocks: [],
    fileName,
    functionReferences: [],
    parameters,
  };
};
