import { createFunctionInfo, type FunctionInfo } from './function-info';
import { createScopeManager } from './scope-manager';
import { Rule } from 'eslint';
import { relative } from 'path';
import { SourceCode } from '@typescript-eslint/utils/ts-eslint';

export type Transpiler = (context: Rule.RuleContext, rootDir: string) => Array<FunctionInfo>;

export const createTranspiler = (): Transpiler => {
  return (ruleContext: Rule.RuleContext, rootDir: string) => {
    const fileName = relative(rootDir, ruleContext.filename);
    const sourceCode = ruleContext.sourceCode as unknown as SourceCode;
    const { ast } = sourceCode;
    const scopeManager = createScopeManager(sourceCode, fileName);

    // create the function info
    createFunctionInfo('main', ast, scopeManager);

    return scopeManager.functionInfos;
  };
};
