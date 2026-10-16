export type TypeScriptFailureCode =
  | 'unsupported-operation'
  | 'invalid-reference'
  | 'disposed'
  | 'cancelled'
  | 'filesystem'
  | 'backend';
export class TypeScriptFailure extends Error {
  readonly code: TypeScriptFailureCode;
  readonly operation?: string;
  constructor(code: TypeScriptFailureCode, message: string, operation?: string);
}
