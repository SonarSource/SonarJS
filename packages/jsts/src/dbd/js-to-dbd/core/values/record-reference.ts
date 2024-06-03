import type { BaseValue } from '../value';
import { createReference, type Reference } from './reference';

export type RecordReference = Reference & {
  record: BaseValue<any>;
};

export const createRecordReference = (
  identifier: number,
  record: BaseValue<any>,
): RecordReference => {
  return {
    ...createReference(identifier),
    record,
  };
};

export const isARecordReference = (value: BaseValue<any>): value is RecordReference => {
  return (
    (value as Reference).type === 'reference' && (value as RecordReference).record !== undefined
  );
};
