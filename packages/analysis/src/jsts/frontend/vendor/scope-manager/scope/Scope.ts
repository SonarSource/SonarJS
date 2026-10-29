import type { BlockScope } from './BlockScope.js';
import type { CatchScope } from './CatchScope.js';
import type { ClassFieldInitializerScope } from './ClassFieldInitializerScope.js';
import type { ClassScope } from './ClassScope.js';
import type { ClassStaticBlockScope } from './ClassStaticBlockScope.js';
import type { ConditionalTypeScope } from './ConditionalTypeScope.js';
import type { ForScope } from './ForScope.js';
import type { FunctionExpressionNameScope } from './FunctionExpressionNameScope.js';
import type { FunctionScope } from './FunctionScope.js';
import type { FunctionTypeScope } from './FunctionTypeScope.js';
import type { GlobalScope } from './GlobalScope.js';
import type { MappedTypeScope } from './MappedTypeScope.js';
import type { ModuleScope } from './ModuleScope.js';
import type { SwitchScope } from './SwitchScope.js';
import type { TSEnumScope } from './TSEnumScope.js';
import type { TSModuleScope } from './TSModuleScope.js';
import type { TypeScope } from './TypeScope.js';
import type { WithScope } from './WithScope.js';

export type Scope =
  | BlockScope
  | CatchScope
  | ClassFieldInitializerScope
  | ClassScope
  | ClassStaticBlockScope
  | ConditionalTypeScope
  | ForScope
  | FunctionExpressionNameScope
  | FunctionScope
  | FunctionTypeScope
  | GlobalScope
  | MappedTypeScope
  | ModuleScope
  | SwitchScope
  | TSEnumScope
  | TSModuleScope
  | TypeScope
  | WithScope;
