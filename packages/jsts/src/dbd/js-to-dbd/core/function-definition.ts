import type { TypeInfo } from './type-info';

export type FunctionDefinition = {
  readonly name: string;
  readonly signature: string;
  readonly returnType?: TypeInfo;
  readonly isVirtual: boolean;
  readonly isAStandardLibraryFunction: boolean;
  readonly isFunctionRef: boolean;
};

export const createFunctionDefinition = (name: string): FunctionDefinition => {
  return {
    name,
    signature: `#${name}#`,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
};

export const createFunctionDefinition2 = (name: string, signature: string): FunctionDefinition => {
  return {
    name,
    signature,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
  };
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
