import type { ESLintScopeVariable } from './ESLintScopeVariable.js';
import type { Variable } from './Variable.js';

export { ESLintScopeVariable } from './ESLintScopeVariable.js';
export {
  ImplicitLibVariable,
  type ImplicitLibVariableOptions,
  type LibDefinition,
} from './ImplicitLibVariable.js';
export { Variable } from './Variable.js';

export type ScopeVariable = ESLintScopeVariable | Variable;
