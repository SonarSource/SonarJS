import { type BaseValue, createValue } from './value';
import { type Constant } from './values/constant';
import {
  type BaseEnvironmentRecord,
  createDeclarativeEnvironmentRecord,
  createGlobalEnvironmentRecord,
  type DeclarativeEnvironmentRecord,
  type EnvironmentRecord,
} from './ecma/environment-record';
import type { FunctionInfo } from './function-info';

type ConstantType =
  | 'bigint'
  | 'boolean'
  | 'function'
  | 'null'
  | 'number'
  | 'object'
  | 'RegExp'
  | 'string'
  | 'symbol'
  | 'undefined';

/**
 * Basically analogous to the ECMAScript concept of Execution Context
 */
export interface ScopeManager {
  createBindingsHolder(): BaseValue<any>;

  createDeclarativeEnvironmentRecord(functionInfo: FunctionInfo): DeclarativeEnvironmentRecord;

  getCurrentEnvironmentRecord(): EnvironmentRecord;

  pushEnvironmentRecord(environmentRecord: BaseEnvironmentRecord<any>): void;

  popEnvironmentRecord(): void;

  readonly valueByConstantTypeRegistry: Map<ConstantType, BaseValue<any>>;

  readonly constantRegistry: Map<Constant['value'], Constant>;

  createValueIdentifier(): number;
}

export const createScopeManager = (functionInfo: FunctionInfo): ScopeManager => {
  let valueIndex = 0;

  let currentEnvironmentRecord: BaseEnvironmentRecord<any> = createGlobalEnvironmentRecord(
    valueIndex++,
    functionInfo,
    new Map(),
  );

  const ecmaScriptLanguageValueByConstantTypeRegistry: ScopeManager['valueByConstantTypeRegistry'] =
    new Map([]);
  const constantRegistry: ScopeManager['constantRegistry'] = new Map([]);

  return {
    valueByConstantTypeRegistry: ecmaScriptLanguageValueByConstantTypeRegistry,
    createBindingsHolder: () => {
      return createValue('object', valueIndex++);
    },
    createDeclarativeEnvironmentRecord: functionInfo => {
      return createDeclarativeEnvironmentRecord(
        valueIndex++,
        currentEnvironmentRecord,
        functionInfo,
      );
    },

    getCurrentEnvironmentRecord: () => currentEnvironmentRecord,

    pushEnvironmentRecord: environmentRecord => {
      currentEnvironmentRecord = environmentRecord;
    },

    popEnvironmentRecord: () => {
      if (currentEnvironmentRecord.outerEnv === null) {
        throw new Error('TRACK MISUSE OF THE API');
      }

      currentEnvironmentRecord = currentEnvironmentRecord.outerEnv;
    },
    createValueIdentifier: () => {
      return valueIndex++;
    },
    constantRegistry,
  };
};
