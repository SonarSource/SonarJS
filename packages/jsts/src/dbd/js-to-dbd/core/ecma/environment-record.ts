import { type ReferenceRecord, unresolvable } from './reference-record';
import type { FunctionInfo } from '../function-info';

export type BaseEnvironmentRecord<
  OuterEnv extends BaseEnvironmentRecord | null = BaseEnvironmentRecord<any>,
> = {
  readonly functionInfo: FunctionInfo;
  readonly identifier: number;
  readonly outerEnv: OuterEnv;

  hasBinding(name: string): boolean;

  getBindingValue(name: string, strict: boolean): any; // todo: type return

  setMutableBinding(name: string, value: any, strict: boolean): void;
};

export const createBaseEnvironmentRecord = <OuterEnv extends BaseEnvironmentRecord<any> | null>(
  identifier: number,
  outerEnv: OuterEnv,
  functionInfo: FunctionInfo,
  bindings: Map<string, any> = new Map(),
): BaseEnvironmentRecord<OuterEnv> => {
  return {
    functionInfo,
    identifier,
    outerEnv,
    hasBinding: name => bindings.has(name),
    getBindingValue: name => bindings.get(name),
    setMutableBinding: (name, value) => bindings.set(name, value),
  };
};

export type DeclarativeEnvironmentRecord = BaseEnvironmentRecord<BaseEnvironmentRecord> & {};

export const createDeclarativeEnvironmentRecord = (
  identifier: number,
  outerEnv: BaseEnvironmentRecord,
  functionInfo: FunctionInfo,
): DeclarativeEnvironmentRecord => {
  return {
    ...createBaseEnvironmentRecord(identifier, outerEnv, functionInfo),
  };
};

export type GlobalEnvironmentRecord = BaseEnvironmentRecord<null> & {};

export const createGlobalEnvironmentRecord = (
  identifier: number,
  functionInfo: FunctionInfo,
  bindings: Map<string, any>,
): GlobalEnvironmentRecord => {
  return createBaseEnvironmentRecord(identifier, null, functionInfo, bindings);
};

export const isAnEnvironmentRecord = (
  candidate: ReferenceRecord['base'],
): candidate is EnvironmentRecord => {
  return (candidate as EnvironmentRecord).outerEnv !== undefined;
};

export const getIdentifierReference = (
  env: EnvironmentRecord | null,
  name: string,
  strict: boolean = true,
): ReferenceRecord => {
  if (env === null) {
    return {
      base: unresolvable,
      referencedName: name,
      strict,
    };
  }

  if (env.hasBinding(name)) {
    return {
      base: env,
      referencedName: name,
      strict,
    };
  }

  return getIdentifierReference(env.outerEnv, name, strict);
};

export type EnvironmentRecord = DeclarativeEnvironmentRecord | GlobalEnvironmentRecord;
