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

describe('S6759', () => {
  it('S6759 should not crash on return outside function', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('S6759', rule, {
      valid: [
        {
          // JS-487: return outside function should not crash
          code: `
const fs = require('fs');
const path = require('path');
const certOutputBase = path.resolve('out', 'cert');
if (fs.existsSync(certOutputBase)) {
    return;
}
          `,
        },
      ],
      invalid: [],
    });
  });

  it('S6759 should handle utility types that preserve readonly modifiers', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('S6759', rule, {
      valid: [
        {
          // JS-506: Omit<T, K> wrapping a readonly interface should NOT raise an issue
          // The BadgeProps interface has all readonly members, so Omit<BadgeProps, 'children'>
          // should also be considered readonly
          code: `
interface BadgeProps {
  readonly className?: string;
  readonly title?: string;
  readonly variant?: string;
  readonly children?: React.ReactNode;
}

type Props = Omit<BadgeProps, 'children'>;

function AICodeBadge(props: Props) {
  return <div className={props.className}>{props.title}</div>;
}
          `,
        },
        {
          // JS-506: Pick<T, K> wrapping a readonly interface should NOT raise an issue
          code: `
interface AllProps {
  readonly id: string;
  readonly name: string;
  readonly value: number;
  readonly disabled: boolean;
}

type SelectedProps = Pick<AllProps, 'id' | 'name'>;

function PickComponent(props: SelectedProps) {
  return <div id={props.id}>{props.name}</div>;
}
          `,
        },
        {
          // JS-506: Partial<T> wrapping a readonly interface should NOT raise an issue
          code: `
interface ReadonlyConfig {
  readonly enabled: boolean;
  readonly timeout: number;
}

type OptionalConfig = Partial<ReadonlyConfig>;

function ConfigComponent(props: OptionalConfig) {
  return <div>{props.enabled ? 'On' : 'Off'}</div>;
}
          `,
        },
        {
          // JS-506: Required<T> wrapping a readonly interface should NOT raise an issue
          code: `
interface OptionalReadonlyProps {
  readonly name?: string;
  readonly age?: number;
}

type RequiredProps = Required<OptionalReadonlyProps>;

function RequiredComponent(props: RequiredProps) {
  return <div>{props.name}: {props.age}</div>;
}
          `,
        },
        {
          // JS-506: Nested utility types - Omit<Pick<T, K>, U> should preserve readonly
          code: `
interface FullProps {
  readonly a: string;
  readonly b: number;
  readonly c: boolean;
  readonly d: object;
}

type NestedProps = Omit<Pick<FullProps, 'a' | 'b' | 'c'>, 'c'>;

function NestedComponent(props: NestedProps) {
  return <div>{props.a}{props.b}</div>;
}
          `,
        },
        {
          // JS-506: Interface extending React.PropsWithChildren with readonly members
          code: `
interface BaseProps extends React.PropsWithChildren {
  readonly className?: string;
  readonly title?: string;
}

type DerivedProps = Omit<BaseProps, 'children'>;

function DerivedComponent(props: DerivedProps) {
  return <div className={props.className}>{props.title}</div>;
}
          `,
        },
      ],
      invalid: [
        {
          // Omit<T, K> where T does NOT have readonly members should still raise an issue
          code: `
interface NonReadonlyProps {
  className?: string;
  title?: string;
  children?: React.ReactNode;
}

type Props = Omit<NonReadonlyProps, 'children'>;

function NonReadonlyComponent(props: Props) {
  return <div className={props.className}>{props.title}</div>;
}
          `,
          errors: [
            {
              messageId: 'readOnlyProps',
              suggestions: [
                {
                  messageId: 'readOnlyPropsFix',
                  output: `
interface NonReadonlyProps {
  className?: string;
  title?: string;
  children?: React.ReactNode;
}

type Props = Omit<NonReadonlyProps, 'children'>;

function NonReadonlyComponent(props: Readonly<Props>) {
  return <div className={props.className}>{props.title}</div>;
}
          `,
                },
              ],
            },
          ],
        },
        {
          // Pick<T, K> where T does NOT have readonly members should still raise an issue
          code: `
interface MutableProps {
  id: string;
  name: string;
  value: number;
}

type SelectedProps = Pick<MutableProps, 'id' | 'name'>;

function MutablePickComponent(props: SelectedProps) {
  return <div id={props.id}>{props.name}</div>;
}
          `,
          errors: [
            {
              messageId: 'readOnlyProps',
              suggestions: [
                {
                  messageId: 'readOnlyPropsFix',
                  output: `
interface MutableProps {
  id: string;
  name: string;
  value: number;
}

type SelectedProps = Pick<MutableProps, 'id' | 'name'>;

function MutablePickComponent(props: Readonly<SelectedProps>) {
  return <div id={props.id}>{props.name}</div>;
}
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
