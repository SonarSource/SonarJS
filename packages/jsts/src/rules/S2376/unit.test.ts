/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S2376', () => {
  it('S2376', () => {
    const ruleTester = new RuleTester();

    ruleTester.run(`Property getters and setters should come in pairs`, rule, {
      valid: [
        {
          code: `
      class C {
        get m() { return this.a; }
        set m(a) { this.a = a; }
      }`,
        },
        {
          code: `
      class C {
        @Input()
        set m(a) { this.a = a; }
      }`,
        },
        {
          code: `
class C {
  get m() { return this.a; }
  set m(a) { this.a = a; }
}`,
          options: [{ getWithoutSet: true }],
        },
      ],
      invalid: [
        {
          code: `
      class C {
        set m(a) { this.a = a; }
      }`,
          errors: 1,
        },
        {
          code: `
      class C {
        @Input
        set m(a) { this.a = a; }
      }`,
          errors: 1,
        },
        {
          code: `
      class C {
        @NonAngularInput()
        set m(a) { this.a = a; }
      }`,
          errors: 1,
        },
        {
          code: `
class C {
  get m() { return this.a; }
}`,
          options: [{ getWithoutSet: true }],
          errors: 1,
        },
      ],
    });
  });
});
