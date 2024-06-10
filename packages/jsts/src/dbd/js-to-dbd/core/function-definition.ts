import type { TypeInfo } from './type-info';

export type FunctionDefinition = {
  readonly name: string;
  readonly signature: string;
  readonly returnType?: TypeInfo;
  readonly isVirtual: boolean;
  readonly isAStandardLibraryFunction: boolean;
  readonly isFunctionRef: boolean;
};

export const createFunctionDefinition = (name: string, signature: string): FunctionDefinition => {
  return {
    name,
    signature,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
};

export const FunctionID = {
  ARRAY_ADD_ALL: 'array-add-all',
  ARRAY_READ: 'array-read',
  NEW_ARRAY: 'new-array',
};
export type BuiltinFunction = (typeof FunctionID)[keyof typeof FunctionID];

export const createDBDInternalFunctionDefinition = (name: BuiltinFunction): FunctionDefinition => {
  return createFunctionDefinition(name, `#${name}#`);
};

export const createIdentityFunctionDefinition = (): FunctionDefinition => {
  const name = 'id';

  return {
    name,
    signature: `#${name}#`,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
};

export const createGetFieldFunctionDefinition = (attributeName: string): FunctionDefinition => {
  const name = 'get-field';
  createFunctionDefinition;
  return {
    name,
    signature: `#${name}# ${attributeName}`,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
};

export const createNewObjectFunctionDefinition = (): FunctionDefinition => {
  const name = 'new-object';

  return {
    name,
    signature: `#${name}#`,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
};

export const createSetFieldFunctionDefinition = (attributeName: string): FunctionDefinition => {
  const name = 'set-field';

  return {
    name,
    signature: `#${name}# ${attributeName}`,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
};

export const createUnaryOperationFunctionDefinition = (operator: string): FunctionDefinition => {
  const name = 'unaryop';

  return {
    name,
    signature: `#${name} ${operator}#`,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
};

export const createBinaryOperationFunctionDefinition = (operator: string): FunctionDefinition => {
  const name = 'binop';

  return {
    name,
    signature: `#${name} ${operator}#`,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
};

export const createAddArrayLastFunctionDefinition = (): FunctionDefinition => {
  const name = 'array-add-last';

  return {
    name,
    signature: `#${name}#`,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
};

export const generateSignature = (name: string, fileName: string) => {
  return `${fileName.replace(/[. ]/g, '_')}.${name}`;
};
