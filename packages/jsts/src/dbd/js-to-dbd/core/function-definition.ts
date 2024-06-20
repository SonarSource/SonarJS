/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import type { TypeInfo } from './type-info';
import ts from 'typescript';

export type FunctionDefinition = {
  readonly name: string;
  readonly signature: string;
  readonly returnType?: TypeInfo;
  readonly isVirtual: boolean;
  readonly isAStandardLibraryFunction: boolean;
  readonly isFunctionRef: boolean;
};

export const createFunctionDefinitionFromName = (name: string, fileName: string) => {
  return createFunctionDefinition(name, generateSignature(name, fileName));
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
  ARRAY_ADD_LAST: 'array-add-last',
  ARRAY_READ: 'array-read',
  NEW_ARRAY: 'new-array',
  UNKNOWN: 'unknown',
};
type BuiltinFunction = (typeof FunctionID)[keyof typeof FunctionID];

export const createDBDInternalFunctionDefinition = (name: BuiltinFunction): FunctionDefinition => {
  return createFunctionDefinition(name, `#${name}#`);
};

export const createGlobalMethodFunctionDefinition = (symbol: ts.Symbol) => {
  const parent = (symbol as any).parent as ts.Symbol;
  if (parent.escapedName === 'Array' && symbol.escapedName === 'push') {
    return createDBDInternalFunctionDefinition(FunctionID.ARRAY_ADD_LAST);
  }
  throw new Error(`Cannot create global method. Check isKnownGlobalMethod before calling this.`);
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

const generateSignature = (name: string, fileName: string) => {
  return `${fileName.replace(/[. ]/g, '_')}.${name}`;
};
