import type { Block } from './block';
import type { FunctionDefinition } from './function-definition';
import { Parameter } from './values/parameter';

export type FunctionInfo = {
  readonly blocks: Array<Block>;
  readonly fileName: string;
  readonly definition: FunctionDefinition;
  readonly parameters: Parameter[];
};

export const createFunctionInfo = (
  fileName: string,
  definition: FunctionDefinition,
  blocks: Array<Block> = [],
  parameters: Parameter[] = [],
): FunctionInfo => {
  return {
    definition,
    blocks,
    fileName,
    parameters,
  };
};
