import type { TypeInfo } from './type-info';

export type FunctionDefinition = {
  readonly name: string;
  readonly signature: string;
  readonly returnType?: TypeInfo;
  readonly isVirtual: boolean;
  readonly isAStandardLibraryFunction: boolean;
  readonly isFunctionRef: boolean;
  readonly isInstanceMethodCall: boolean;
};

export const createFunctionDefinition = (name: string): FunctionDefinition => {
  return {
    name,
    signature: `#${name}#`,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef: false,
    isInstanceMethodCall: false,
  };
};

export const createFunctionDefinition2 = (
  name: string,
  signature: string,
  isFunctionRef: boolean = false,
  isInstanceMethodCall: boolean = false,
): FunctionDefinition => {
  return {
    name,
    signature,
    isVirtual: false,
    isAStandardLibraryFunction: false,
    isFunctionRef,
    isInstanceMethodCall,
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
    isInstanceMethodCall: false,
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
    isInstanceMethodCall: false,
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
    isInstanceMethodCall: false,
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
    isInstanceMethodCall: false,
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
    isInstanceMethodCall: false,
  };
};
