import { type EnvironmentRecord, isAnEnvironmentRecord } from './environment-record';
import type { BaseValue } from '../value';

export const unresolvable = Symbol();

export type Record = BaseValue<any> | EnvironmentRecord | typeof unresolvable;

/**
 * For example, the left-hand operand of an assignment is expected to produce a Reference Record.
 * @see https://262.ecma-international.org/14.0/#sec-reference-record-specification-type
 */
export type BaseReferenceRecord = {
  referencedName: string;
  strict: boolean;
};

export type ResolvableReferenceRecord = BaseReferenceRecord & {
  base: Exclude<Record, typeof unresolvable>;
};

export type UnresolvableReferenceRecord = BaseReferenceRecord & {
  base: typeof unresolvable;
};

export type ReferenceRecord = ResolvableReferenceRecord | UnresolvableReferenceRecord;

export const isUnresolvableReference = (
  referenceRecord: ReferenceRecord,
): referenceRecord is UnresolvableReferenceRecord => {
  return referenceRecord.base === unresolvable;
};

export const isAReferenceRecord = (
  candidate: BaseValue<any> | ReferenceRecord,
): candidate is ReferenceRecord => {
  return (candidate as ReferenceRecord).base !== undefined;
};

export const getValue = (value: BaseValue<any> | ReferenceRecord): BaseValue<any> | null => {
  if (!isAReferenceRecord(value)) {
    return value;
  }

  if (isUnresolvableReference(value)) {
    throw new Error('ReferenceError');
  }

  const { base } = value;

  if (isAnEnvironmentRecord(base)) {
    return base.getBindingValue(value.referencedName, value.strict);
  } else {
    // is property reference
    return base.bindings.get(value.referencedName) || null;
  }
};

export const putValue = (scope: ReferenceRecord | BaseValue<any>, value: BaseValue<any>): void => {
  if (!isAReferenceRecord(scope)) {
    throw new Error('ReferenceError');
  }

  if (isUnresolvableReference(scope)) {
    if (scope.strict) {
      throw new Error('ReferenceError');
    } else {
      throw new Error('ReferenceError for now but should be handled according to spec');
    }
  }

  const { base } = scope;

  if (!isAnEnvironmentRecord(base)) {
    // isPropertyReference
    base.bindings.set(scope.referencedName, value);

    return;
  } else {
    return base.setMutableBinding(scope.referencedName, value, scope.strict);
  }
};
