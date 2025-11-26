/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { parseForESLint } from '@typescript-eslint/parser';
import { RequiredParserServices, typeHasMethod } from '../../../src/rules/helpers/index.js';
import { createProgramFromSingleFile } from '../../../src/program/factory.js';

// Helper function to create a TypeScript program and services from source code
function createProgramFromSource(sourceCode: string): {
  services: RequiredParserServices;
  ast: any;
} {
  // Create a virtual file system with our source code
  const fileName = 'test.ts';
  const program = createProgramFromSingleFile(fileName, sourceCode);

  // Parse with TypeScript ESLint parser
  const parseResult = parseForESLint(sourceCode, {
    loc: true,
    range: true,
    tokens: true,
    comment: true,
    ecmaVersion: 2020,
    sourceType: 'module',
    programs: [program],
    filePath: fileName,
    ecmaFeatures: {
      globalReturn: false,
      jsx: false,
    },
  });

  return {
    services: parseResult.services as RequiredParserServices,
    ast: parseResult.ast,
  };
}

// Helper to find a node by its text content in the AST
function findNodeByText(node: any, text: string): any {
  if (node.type === 'Identifier' && node.name === text) {
    return node;
  }
  if (node.type === 'MemberExpression' && node.property?.name === text) {
    return node.object;
  }

  for (const key in node) {
    if (key === 'parent') continue;
    const child = node[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object') {
            const found = findNodeByText(item, text);
            if (found) return found;
          }
        }
      } else {
        const found = findNodeByText(child, text);
        if (found) return found;
      }
    }
  }
  return null;
}

describe('typeHasMethod', () => {
  describe('Array methods', () => {
    it('should detect push method on array', () => {
      const sourceCode = `
        const arr: number[] = [1, 2, 3];
        arr.push(4);
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const arrNode = findNodeByText(ast, 'push');

      expect(arrNode).toBeTruthy();
      const result = typeHasMethod(arrNode, 'push', services);
      expect(result).toBe(true);
    });

    it('should detect slice method on array', () => {
      const sourceCode = `
        const arr: string[] = ['a', 'b', 'c'];
        arr.slice(1);
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const arrNode = findNodeByText(ast, 'slice');

      expect(arrNode).toBeTruthy();
      const result = typeHasMethod(arrNode, 'slice', services);
      expect(result).toBe(true);
    });

    it('should detect at method on array', () => {
      const sourceCode = `
        const arr: number[] = [1, 2, 3];
        arr.at(-1);
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const arrNode = findNodeByText(ast, 'at');

      expect(arrNode).toBeTruthy();
      const result = typeHasMethod(arrNode, 'at', services);
      expect(result).toBe(true);
    });

    it('should return false for non-existent method on array', () => {
      const sourceCode = `
        const arr: number[] = [1, 2, 3];
        const x = arr;
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const arrNode = findNodeByText(ast, 'arr');

      expect(arrNode).toBeTruthy();
      const result = typeHasMethod(arrNode, 'nonExistentMethod', services);
      expect(result).toBe(false);
    });
  });

  describe('String methods', () => {
    it('should detect charAt method on string', () => {
      const sourceCode = `
        const str: string = "hello";
        str.charAt(0);
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const strNode = findNodeByText(ast, 'charAt');

      expect(strNode).toBeTruthy();
      const result = typeHasMethod(strNode, 'charAt', services);
      expect(result).toBe(true);
    });

    it('should detect substring method on string', () => {
      const sourceCode = `
        const text: string = "hello world";
        text.substring(0, 5);
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const textNode = findNodeByText(ast, 'substring');

      expect(textNode).toBeTruthy();
      const result = typeHasMethod(textNode, 'substring', services);
      expect(result).toBe(true);
    });
  });

  describe('Object methods', () => {
    it('should detect toString method on object', () => {
      const sourceCode = `
        const obj: object = {};
        obj.toString();
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const objNode = findNodeByText(ast, 'toString');

      expect(objNode).toBeTruthy();
      const result = typeHasMethod(objNode, 'toString', services);
      expect(result).toBe(true);
    });

    it('should detect valueOf method on object', () => {
      const sourceCode = `
        const obj: object = {};
        obj.valueOf();
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const objNode = findNodeByText(ast, 'valueOf');

      expect(objNode).toBeTruthy();
      const result = typeHasMethod(objNode, 'valueOf', services);
      expect(result).toBe(true);
    });
  });

  describe('Custom class methods', () => {
    it('should detect custom method on class instance', () => {
      const sourceCode = `
        class MyClass {
          customMethod(): void {}
        }
        const instance: MyClass = new MyClass();
        instance.customMethod();
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const instanceNode = findNodeByText(ast, 'instance');

      expect(instanceNode).toBeTruthy();
      const result = typeHasMethod(instanceNode, 'customMethod', services);
      expect(result).toBe(true);
    });

    it('should return false for non-existent method on class instance', () => {
      const sourceCode = `
        class MyClass {
          existingMethod(): void {}
        }
        const instance: MyClass = new MyClass();
        const x = instance;
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const instanceNode = findNodeByText(ast, 'instance');

      expect(instanceNode).toBeTruthy();
      const result = typeHasMethod(instanceNode, 'nonExistentMethod', services);
      expect(result).toBe(false);
    });
  });

  describe('Function properties', () => {
    it('should detect callable property on object type', () => {
      const sourceCode = `
        interface MyInterface {
          myFunction: () => void;
        }
        const obj: MyInterface = { myFunction: () => {} };
        obj.myFunction();
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const objNode = findNodeByText(ast, 'obj');

      expect(objNode).toBeTruthy();
      const result = typeHasMethod(objNode, 'myFunction', services);
      expect(result).toBe(true);
    });

    it('should return false for non-callable property', () => {
      const sourceCode = `
        interface MyInterface {
          myProperty: string;
        }
        const obj: MyInterface = { myProperty: "value" };
        const prop = obj.myProperty;
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const objNode = findNodeByText(ast, 'myProperty');

      expect(objNode).toBeTruthy();
      const result = typeHasMethod(objNode, 'myProperty', services);
      expect(result).toBe(false);
    });
  });

  describe('Built-in types', () => {
    it('should detect Date methods', () => {
      const sourceCode = `
        const date: Date = new Date();
        date.getTime();
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const dateNode = findNodeByText(ast, 'getTime');

      expect(dateNode).toBeTruthy();
      const result = typeHasMethod(dateNode, 'getTime', services);
      expect(result).toBe(true);
    });

    it('should detect Map methods', () => {
      const sourceCode = `
        const map: Map<string, number> = new Map();
        map.set("key", 1);
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const mapNode = findNodeByText(ast, 'set');

      expect(mapNode).toBeTruthy();
      const result = typeHasMethod(mapNode, 'set', services);
      expect(result).toBe(true);
    });

    it('should detect Set methods', () => {
      const sourceCode = `
        const set: Set<string> = new Set();
        set.add("value");
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const setNode = findNodeByText(ast, 'add');

      expect(setNode).toBeTruthy();
      const result = typeHasMethod(setNode, 'add', services);
      expect(result).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle union types with method', () => {
      const sourceCode = `
        function test(value: string | number) {
          value.toString();
        }
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const valueNode = findNodeByText(ast, 'toString');

      expect(valueNode).toBeTruthy();
      const result = typeHasMethod(valueNode, 'toString', services);
      expect(result).toBe(true);
    });

    it('should handle generic types', () => {
      const sourceCode = `
        function genericTest<T extends { myMethod(): void }>(obj: T) {
          obj.myMethod();
        }
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const objNode = findNodeByText(ast, 'myMethod');

      expect(objNode).toBeTruthy();
      const result = typeHasMethod(objNode, 'myMethod', services);
      expect(result).toBe(true);
    });

    it('should return false for primitive values without the method', () => {
      const sourceCode = `
        const num: number = 42;
        const x = num;
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const numNode = findNodeByText(ast, 'num');

      expect(numNode).toBeTruthy();
      const result = typeHasMethod(numNode, 'push', services);
      expect(result).toBe(false);
    });
  });

  describe('Method inheritance', () => {
    it('should detect inherited methods', () => {
      const sourceCode = `
        class BaseClass {
          baseMethod(): void {}
        }
        class DerivedClass extends BaseClass {
          derivedMethod(): void {}
        }
        const instance: DerivedClass = new DerivedClass();
        instance.baseMethod();
      `;

      const { services, ast } = createProgramFromSource(sourceCode);
      const instanceNode = findNodeByText(ast, 'instance');

      expect(instanceNode).toBeTruthy();
      const result = typeHasMethod(instanceNode, 'baseMethod', services);
      expect(result).toBe(true);
    });
  });
});
