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
import { rule } from './index.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('S4325', () => {
  it('S4325', () => {
    const ruleTester = new RuleTester();

    ruleTester.run('Unnecessary type assertions should be removed', rule, {
      valid: [
        // Compliant: generic return type narrowed by assertion
        {
          code: `
interface ViewRef { destroy(): void; }
interface EmbeddedViewRef<C> extends ViewRef { rootNodes: HTMLElement[]; }
class ViewContainerRef {
  private views: ViewRef[] = [];
  get<T extends ViewRef>(index: number): T | null { return (this.views[index] as T) ?? null; }
}
function measure(vc: ViewContainerRef) {
  const view = vc.get(0) as EmbeddedViewRef<unknown> | null;
  return view?.rootNodes[0];
}
          `,
        },
        // Compliant: generic method return type
        {
          code: `
interface Schema { validate<T>(value: unknown): T; }
function run<T>(schema: Schema, getValue: () => unknown) {
  return schema.validate(getValue()) as T | Promise<T>;
}
          `,
        },
        // Compliant: cast to any
        {
          code: `const x: string = 'hello'; const y = x as any;`,
        },
        // Compliant: cast to unknown
        {
          code: `const x: string = 'hello'; const y = x as unknown;`,
        },
        // Compliant: assertion narrows non-generic union return type
        {
          code: `
function getVal(): string | number { return 42; }
const s = getVal() as string;
          `,
        },
      ],
      invalid: [
        // Noncompliant: typeof narrowing already makes x a string
        {
          code: `
function getName(x?: string | object) {
  if (typeof x === 'string') { return (x as string); }
  return '';
}
          `,
          errors: 1,
          output: `
function getName(x?: string | object) {
  if (typeof x === 'string') { return (x); }
  return '';
}
          `,
        },
        // Noncompliant: truthy check already removes undefined
        {
          code: `
function getName(x?: string) {
  if (x) { return x!; }
  return '';
}
          `,
          errors: 1,
          output: `
function getName(x?: string) {
  if (x) { return x; }
  return '';
}
          `,
        },
        // Noncompliant: same type as already inferred
        {
          code: `const x: string = 'hello'; const y = x as string;`,
          errors: 1,
          output: `const x: string = 'hello'; const y = x;`,
        },
      ],
    });
  });

  it('S4325 with strictNullChecks', () => {
    const strictRuleTester = new RuleTester({
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: fixtures,
      },
    });

    strictRuleTester.run('Unnecessary type assertions should be removed (strictNullChecks)', rule, {
      valid: [
        // Compliant: non-null assertion on nullable property
        {
          code: `
interface Api { fetch(): Promise<string>; }
class Client {
  api: Api | null = null;
  async getData() { return await this.api!.fetch(); }
}
          `,
          filename: path.join(fixtures, 'placeholder.tsx'),
        },
        // Compliant: non-null assertion on optional parameter
        {
          code: `function process(value: string | undefined) { return value!.toUpperCase(); }`,
          filename: path.join(fixtures, 'placeholder.tsx'),
        },
        // Compliant: non-null assertion on nullable interface property
        {
          code: `
interface Config { timeout: number | null; }
function getTimeout(config: Config): number { return config.timeout!; }
          `,
          filename: path.join(fixtures, 'placeholder.tsx'),
        },
      ],
      invalid: [
        // Noncompliant: truthy check already removes undefined (with strictNullChecks)
        {
          code: `
function getName(x?: string) {
  if (x) { return x!; }
  return '';
}
          `,
          filename: path.join(fixtures, 'placeholder.tsx'),
          errors: 1,
          output: `
function getName(x?: string) {
  if (x) { return x; }
  return '';
}
          `,
        },
      ],
    });
  });
});
