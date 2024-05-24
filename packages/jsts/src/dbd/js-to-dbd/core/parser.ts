import { parse, TSESTree } from '@typescript-eslint/typescript-estree';

export type Parser = (code: string) => TSESTree.Program;

export const createParser = (): Parser => {
  return code =>
    parse(code, {
      loc: true,
    });
};
