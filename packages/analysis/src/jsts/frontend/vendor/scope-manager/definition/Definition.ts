import type { CatchClauseDefinition } from './CatchClauseDefinition.js';
import type { ClassNameDefinition } from './ClassNameDefinition.js';
import type { FunctionNameDefinition } from './FunctionNameDefinition.js';
import type { ImplicitGlobalVariableDefinition } from './ImplicitGlobalVariableDefinition.js';
import type { ImportBindingDefinition } from './ImportBindingDefinition.js';
import type { ParameterDefinition } from './ParameterDefinition.js';
import type { TSEnumMemberDefinition } from './TSEnumMemberDefinition.js';
import type { TSEnumNameDefinition } from './TSEnumNameDefinition.js';
import type { TSModuleNameDefinition } from './TSModuleNameDefinition.js';
import type { TypeDefinition } from './TypeDefinition.js';
import type { VariableDefinition } from './VariableDefinition.js';

export type Definition =
  | CatchClauseDefinition
  | ClassNameDefinition
  | FunctionNameDefinition
  | ImplicitGlobalVariableDefinition
  | ImportBindingDefinition
  | ParameterDefinition
  | TSEnumMemberDefinition
  | TSEnumNameDefinition
  | TSModuleNameDefinition
  | TypeDefinition
  | VariableDefinition;
