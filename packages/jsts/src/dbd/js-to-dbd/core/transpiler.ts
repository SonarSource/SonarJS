import { TSESTree } from '@typescript-eslint/typescript-estree';
import {
  createFunctionDefinition,
  createSetFieldFunctionDefinition,
  generateSignature,
} from './function-definition';
import { createReturnInstruction } from './instructions/return-instruction';
import { createFunctionInfo, type FunctionInfo } from './function-info';
import { createScopeDeclarationInstruction, isTerminated } from './utils';
import { handleStatement as _handleStatement } from './statements';
import { createScopeManager } from './scope-manager';
import { createCallInstruction } from './instructions/call-instruction';
import { createBranchingInstruction } from './instructions/branching-instruction';
import { createNull } from './values/constant';
import { createReference } from './values/reference';
import { createContext } from './context';
import { createBlockManager } from './block-manager';
import { Rule } from 'eslint';
import { relative } from 'path';
import { SourceCode } from '@typescript-eslint/utils/ts-eslint';

export type Transpiler = (context: Rule.RuleContext, rootDir: string) => Array<FunctionInfo>;

export const createTranspiler = (): Transpiler => {
  return (ruleContext: Rule.RuleContext, rootDir: string) => {
    const fileName = relative(rootDir, ruleContext.filename);
    const sourceCode = ruleContext.sourceCode as unknown as SourceCode;
    const { ast } = sourceCode;
    const globalScopeId = 0;
    const scopeManager = createScopeManager(sourceCode);

    const location = ast.loc;
    const blockManager = createBlockManager();

    const { createValueIdentifier } = scopeManager;
    const { pushBlock, createBlock } = blockManager;

    /**
     *  set up the global environment record
     *  @see https://262.ecma-international.org/14.0/#sec-global-environment-records
     */
    const globalBlock = createBlock(location);

    pushBlock(globalBlock);

    // add the scope creation instruction
    globalBlock.instructions.push(createScopeDeclarationInstruction(globalScopeId, location));

    // globalThis is a reference to the outer scope itself
    globalBlock.instructions.push(
      createCallInstruction(
        createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition('globalThis'),
        [createReference(globalScopeId), createReference(globalScopeId)],
        location,
      ),
    );

    // create the function info
    const functionInfo = createFunctionInfo(
      fileName,
      createFunctionDefinition('main', generateSignature('main', fileName)),
      [],
      [],
    );

    const context = createContext(functionInfo, blockManager, scopeManager);

    // create the main function block
    const mainBlock = blockManager.createBlock(location);

    // branch the global block to the main block
    globalBlock.instructions.push(createBranchingInstruction(mainBlock, location));

    blockManager.pushBlock(mainBlock);

    const handleStatement = (statement: TSESTree.Statement) => {
      return _handleStatement(statement, context);
    };

    // handle the body statements
    ast.body.forEach(handleStatement);

    const lastBlock = blockManager.getCurrentBlock();

    if (!isTerminated(lastBlock)) {
      lastBlock.instructions.push(createReturnInstruction(createNull(), location));
    }

    functionInfo.blocks.push(...blockManager.blocks);

    scopeManager.addFunctionInfo(functionInfo);

    return scopeManager.functionInfos;
  };
};
