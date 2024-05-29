import { type ScopeManager } from './scope-manager';
import type { FunctionInfo } from './function-info';
import type { BlockManager } from './block-manager';

export type Context = {
  readonly blockManager: BlockManager;
  readonly functionInfo: FunctionInfo;
  readonly scopeManager: ScopeManager;
};

export const createContext = (
  functionInfo: FunctionInfo,
  blockManager: BlockManager,
  scopeManager: ScopeManager,
): Context => {
  return {
    blockManager,
    functionInfo,
    scopeManager,
  };
};

// export interface ContextManager {
//   createAnonymousFunctionName(): string;
// }
//
// export class ContextManager {
//   private readonly blockManager: BlockManager;
//   private readonly scopeManager: ScopeManagerClass;
//   private readonly signaturePrefixStr: string;
//   private anonymousFunctionIndex: number = 0;
//
//   constructor(
//     readonly root: string,
//     public readonly functionInfo: FunctionInfo,
//     private readonly location: Location,
//     public readonly hostDefinedProperties: Array<Variable> = [],
//     public readonly processFunction: (
//       functionInfo: FunctionInfo,
//       node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression,
//     ) => void,
//   ) {
//     this.scopeManager = new ScopeManagerClass();
//     this.blockManager = new BlockManager(this.scopeManager, this.functionInfo);
//     this.signaturePrefixStr = getSignaturePrefix(root, functionInfo.fileName);
//     this.setupGlobals();
//   }
//
//   createAnonymousFunctionName() {
//     return `anonymous_${this.anonymousFunctionIndex++}`;
//   }
//
//   get scope(): ScopeManagerClass {
//     return this.scopeManager;
//   }
//
//   get block(): BlockManager {
//     return this.blockManager;
//   }
//
//   signaturePrefix(): string {
//     return this.signaturePrefixStr;
//   }
//
//   addParameter(param: TSESTree.Parameter) {
//     if (param.type !== 'Identifier') {
//       console.error(`Unknown method parameter type ${param.type}`);
//       return;
//     }
//     const valueId = this.scope.createValueIdentifier();
//     const parameter = createParameter(valueId, param.name, param.loc);
//     this.functionInfo.parameters.push(parameter);
//     const variable = createVariable(param.name);
//     this.scope.getCurrentScope().variables.set(param.name, variable);
//   }
//
//   setupGlobals() {
//     // create and declare the outer scope
//     // https://262.ecma-international.org/14.0/#sec-global-environment-records
//     const outerScope: Scope = this.scope.push(this.scope.createScope());
//
//     const outerBlock = this.block.createScopedBlock(this.location);
//
//     this.block.push(outerBlock);
//
//     outerBlock.instructions.push(createScopeDeclarationInstruction(outerScope, this.location));
//
//     // globalThis, a reference to the outer scope itself
//     outerBlock.instructions.push(
//       createCallInstruction(
//         this.scope.createValueIdentifier(),
//         null,
//         createSetFieldFunctionDefinition('globalThis'),
//         [createReference(outerScope.identifier), createReference(outerScope.identifier)],
//         this.location,
//       ),
//     );
//
//     // assign global variables to the outer scope and declare them
//     const globalVariables: Array<Variable> = [
//       createVariable('NaN', 'NaN', false),
//       createVariable('Infinity', 'int', false),
//       createVariable('undefined', 'Record', false),
//       ...this.hostDefinedProperties,
//     ];
//
//     for (const globalVariable of globalVariables) {
//       const { name } = globalVariable;
//       const assignmentIdentifier = this.scope.createValueIdentifier();
//
//       const assignment = createAssignment(assignmentIdentifier, globalVariable);
//
//       outerScope.variables.set(name, globalVariable);
//       outerScope.assignments.set(name, assignment);
//
//       outerBlock.instructions.push(
//         createCallInstruction(
//           assignment.identifier,
//           null,
//           createSetFieldFunctionDefinition(name),
//           [
//             createReference(outerScope.identifier),
//             createConstant(this.scope.createValueIdentifier(), name), // todo: temporary workaround until we know how to declare the shape of globals
//           ],
//           this.location,
//         ),
//       );
//     }
//
//     this.scope.push(outerScope);
//
//     // create the first inner scope
//     const rootScope = this.scope.createScope();
//
//     this.scope.push(rootScope);
//
//     // create the first block and branch the outer block to it
//     const rootBlock = this.block.createScopedBlock(this.location);
//
//     outerBlock.instructions.push(createBranchingInstruction(rootBlock, this.location));
//
//     this.block.push(rootBlock);
//
//     // create scope instruction
//     const instruction = createCallInstruction(
//       rootScope.identifier,
//       null,
//       createFunctionDefinition(`new-object`),
//       [],
//       this.location,
//     );
//
//     rootBlock.instructions.push(instruction);
//   }
// }
