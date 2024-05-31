import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { createVariable, type Variable } from './variable';
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
import { createConstant, createNull } from './values/constant';
import { createReference } from './values/reference';
import { createParameter } from './values/parameter';
import { type Context, createContext } from './context';
import { createBlockManager } from './block-manager';
import type { Value } from './value';
import { putValue } from './ecma/reference-record';

export type Transpiler = (ast: TSESTree.Program, fileName: string) => Array<FunctionInfo>;

export const createTranspiler = (hostDefinedProperties: Array<Variable> = []): Transpiler => {
  return (program, fileName) => {
    const functionInfos: Array<FunctionInfo> = [];

    // create the function info
    const functionInfo = createFunctionInfo(
      fileName,
      createFunctionDefinition('main', generateSignature('main', fileName)),
      [],
    );

    const scopeManager = createScopeManager(functionInfo);

    const processChildFunctionInfo: Context['processFunction'] = (
      name,
      statements,
      parameters,
      location,
    ) => {
      const parentScopeName = '@parent';
      const parentReference = createParameter(createValueIdentifier(), parentScopeName, location);

      // resolve the function parameters
      const functionParameters = [
        parentReference,
        ...parameters.map(parameter => {
          let parameterName: string;

          if (parameter.type === AST_NODE_TYPES.Identifier) {
            parameterName = parameter.name;
          } else {
            // todo
            parameterName = '';
          }

          return createParameter(createValueIdentifier(), parameterName, parameter.loc);
        }),
      ];

      // create the function info
      const functionInfo = createFunctionInfo(
        fileName,
        createFunctionDefinition(name, generateSignature(name, fileName)),
        functionParameters,
      );

      // create the function environment record
      const functionEnvironmentRecord =
        scopeManager.createDeclarativeEnvironmentRecord(functionInfo);

      scopeManager.pushEnvironmentRecord(functionEnvironmentRecord);

      // create the block manager
      const blockManager = createBlockManager();

      // create the main function block
      const block = blockManager.createBlock(scopeManager.getCurrentEnvironmentRecord(), location);

      blockManager.pushBlock(block);

      // add the scope creation instruction
      block.instructions.push(
        createScopeDeclarationInstruction(scopeManager.getCurrentEnvironmentRecord(), location),
      );

      // add the "set parent" instruction
      block.instructions.push(
        createCallInstruction(
          scopeManager.createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition('@parent'),
          [createReference(scopeManager.getCurrentEnvironmentRecord().identifier), parentReference],
          location,
        ),
      );

      const context = createContext(
        functionInfo,
        blockManager,
        scopeManager,
        processChildFunctionInfo,
      );

      const handleStatement = (statement: TSESTree.Statement) => {
        return _handleStatement(statement, context);
      };

      // handle the body statements
      statements.forEach(handleStatement);

      const lastBlock = blockManager.getCurrentBlock();

      if (!isTerminated(lastBlock)) {
        lastBlock.instructions.push(createReturnInstruction(createNull(), location));
      }

      scopeManager.popEnvironmentRecord();

      functionInfo.blocks.push(...blockManager.blocks);

      functionInfos.push(functionInfo);

      return functionInfo;
    };

    const location = program.loc;
    const blockManager = createBlockManager();

    const { createValueIdentifier } = scopeManager;
    const { pushBlock, createBlock } = blockManager;

    /**
     *  set up the global environment record
     *  @see https://262.ecma-international.org/14.0/#sec-global-environment-records
     */
    const globalEnvironmentRecord = scopeManager.getCurrentEnvironmentRecord();
    const globalBlock = createBlock(globalEnvironmentRecord, location);

    pushBlock(globalBlock);

    // add the scope creation instruction
    globalBlock.instructions.push(
      createScopeDeclarationInstruction(scopeManager.getCurrentEnvironmentRecord(), location),
    );

    // globalThis is a reference to the outer scope itself
    globalBlock.instructions.push(
      createCallInstruction(
        createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition('globalThis'),
        [
          createReference(globalEnvironmentRecord.identifier),
          createReference(globalEnvironmentRecord.identifier),
        ],
        location,
      ),
    );

    // assign global variables to the outer scope and declare them
    const globalVariables: Array<[Variable, Value]> = [
      [createVariable('NaN', 'NaN', false), createNull()],
      [createVariable('Infinity', 'int', false), createNull()],
      /**
       * From the point of view of the DBD engine, `undefined` behaves like `null`
       * From the point of view of ECMAScript, `undefined` is a binding of the global environment record
       * From the point of view of this transpiler, `undefined` is a record that considers every binding as resolvable in order to overcome the conservative nature of the DBD engine
       */
      [
        createVariable('undefined', 'Record', false),
        {
          ...createNull(),
          bindings: {
            ...createNull().bindings,
            has: () => true,
          },
        },
      ],
      ...(hostDefinedProperties.map(property => {
        return [property, createConstant(createValueIdentifier(), property.name)];
      }) as Array<[Variable, Value]>),
    ];

    for (const [globalVariable, value] of globalVariables) {
      const { name } = globalVariable;

      putValue(
        {
          base: globalEnvironmentRecord,
          referencedName: name,
          strict: true,
        },
        value,
      );

      globalBlock.instructions.push(
        createCallInstruction(
          createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition(name),
          [createReference(globalEnvironmentRecord.identifier), value],
          program.loc,
        ),
      );
    }

    const context = createContext(
      functionInfo,
      blockManager,
      scopeManager,
      processChildFunctionInfo,
    );

    // create the function environment record
    const functionEnvironmentRecord = scopeManager.createDeclarativeEnvironmentRecord(functionInfo);

    scopeManager.pushEnvironmentRecord(functionEnvironmentRecord);

    // create the main function block
    const mainBlock = blockManager.createBlock(
      scopeManager.getCurrentEnvironmentRecord(),
      location,
    );

    // branch the global block to the main block
    globalBlock.instructions.push(createBranchingInstruction(mainBlock, location));

    // add the scope creation instruction
    mainBlock.instructions.push(
      createScopeDeclarationInstruction(scopeManager.getCurrentEnvironmentRecord(), location),
    );

    // add the "set parent" instruction
    mainBlock.instructions.push(
      createCallInstruction(
        scopeManager.createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition('@parent'),
        [
          createReference(scopeManager.getCurrentEnvironmentRecord().identifier),
          createReference(globalEnvironmentRecord.identifier),
        ],
        location,
      ),
    );

    blockManager.pushBlock(mainBlock);

    const handleStatement = (statement: TSESTree.Statement) => {
      return _handleStatement(statement, context);
    };

    // handle the body statements
    program.body.forEach(handleStatement);

    const lastBlock = blockManager.getCurrentBlock();

    if (!isTerminated(lastBlock)) {
      lastBlock.instructions.push(createReturnInstruction(createNull(), location));
    }

    scopeManager.popEnvironmentRecord();

    functionInfo.blocks.push(...blockManager.blocks);

    functionInfos.push(functionInfo);

    return functionInfos;
  };
};
