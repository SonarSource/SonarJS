/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { RuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import path from 'node:path';

describe('S6767 TypeScript coverage', () => {
  it('should exercise TypeScript type-checking paths (Strategy C in react helpers)', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });

    const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'placeholder.tsx');

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [
        {
          // FP: TypeScript function component with props delegation — Strategy C finds
          // the component and hasPropsCall suppresses the report.
          code: `
declare const React: any;
interface CardProps {
  title: string;
}
function Card(props: CardProps) {
  const result = helper(props);
  return <div>{result}</div>;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: TypeScript class component with this.props delegation — Strategy C
          // matches BarProps to Bar via matchesClassProps, hasPropsCall finds getStyle(this.props).
          code: `
declare const React: any;
interface BarProps {
  barOffset?: number;
}
class Bar extends React.Component<BarProps> {
  props: BarProps;
  render() {
    return <div style={getStyle(this.props)} />;
  }
}
`,
          filename: fixtureFile,
        },
        {
          // FP: TypeScript function component spreads props — Strategy C matches
          // MyComponentProps to MyComponent, hasPropsCall finds the SpreadElement.
          code: `
declare const React: any;
interface MyComponentProps {
  color: string;
  size: number;
}
function MyComponent(props: MyComponentProps) {
  return <SomeComponent {...props} />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: TypeScript class component with this.props[key] — Strategy C matches
          // VictoryAxisProps to VictoryAxis via matchesClassProps, hasPropsCall finds computed MemberExpression.
          code: `
declare const React: any;
interface VictoryAxisProps {
  offsetX?: number;
  offsetY?: number;
}
class VictoryAxis extends React.Component<VictoryAxisProps> {
  props: VictoryAxisProps;
  static animationWhitelist: Array<keyof VictoryAxisProps> = ['offsetX', 'offsetY'];
  animate() {
    return VictoryAxis.animationWhitelist.reduce((acc: Record<string, unknown>, key) => {
      acc[key] = this.props[key];
      return acc;
    }, {});
  }
  render() {
    return <div>{this.animate()}</div>;
  }
}
`,
          filename: fixtureFile,
        },
        {
          // FP: TypeScript function component with React.forwardRef closure — scope analysis
          // confirms both props.label and props.disabled are referenced inside the callback.
          code: `
declare const React: any;
interface InputProps {
  label: string;
  disabled?: boolean;
}
function InputWrapper(props: InputProps) {
  const ForwardedInput = React.forwardRef((_: any, ref: any) => (
    <label>
      {props.label}
      <input ref={ref} disabled={props.disabled} />
    </label>
  ));
  return <ForwardedInput />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: TypeScript function component with renamed props parameter in React.forwardRef closure.
          code: `
declare const React: any;
interface InputProps {
  label: string;
}
function InputWrapper(ownProps: InputProps) {
  const ForwardedInput = React.forwardRef((_: any, ref: any) => (
    <label ref={ref}>{ownProps.label}</label>
  ));
  return <ForwardedInput />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: the reported class itself forwards whole props to its own custom superclass.
          // The decorator intentionally treats this narrow handoff as sufficient usage.
          code: `
declare const React: any;
interface ForwardedCounterProps {
  initialCount: number;
  label: string;
}
class CounterPanelBase extends React.Component<ForwardedCounterProps> {}
class ForwardedCounterPanel extends CounterPanelBase {
  props: ForwardedCounterProps;
  constructor(props: ForwardedCounterProps) {
    super(props);
    this.renderLabel = this.renderLabel.bind(this);
  }
  renderLabel() {
    return <span>{this.props.label}</span>;
  }
  render() {
    return this.renderLabel();
  }
}
`,
          filename: fixtureFile,
        },
        {
          // FP: whole props are only forwarded to the custom superclass, never accessed locally.
          // This isolates hasOwnCustomSuperclassPropsForwarding from hasPropsCall.
          code: `
declare const React: any;
interface ForwardedOnlyProps {
  initialCount: number;
}
class CounterPanelBase extends React.Component<ForwardedOnlyProps> {}
class ForwardedOnlyPanel extends CounterPanelBase {
  props: ForwardedOnlyProps;
  constructor(props: ForwardedOnlyProps) {
    super(props);
  }
  render() {
    return <span>ready</span>;
  }
}
`,
          filename: fixtureFile,
        },
      ],
      invalid: [
        {
          // TP: TypeScript function component — Strategy C exercises findOwnerByType,
          // collectComponentNodes, matchesFunctionProps, and getFunctionName (FunctionDeclaration path).
          // A lowercase helper function exercises the "funcName starts with lowercase" early return.
          code: `
declare const React: any;
interface CardProps {
  title: string;
  subtitle: string;
}
function helper(props: CardProps) { return null; }
function Card(props: CardProps) {
  return <div>{props.title}</div>;
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: Arrow function component in VariableDeclarator — exercises the
          // ArrowFunctionExpression branch of getFunctionName (lines 163-166).
          code: `
declare const React: any;
interface BannerProps {
  text: string;
  size: number;
}
const Banner = (props: BannerProps) => <div>{props.text}</div>;
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: TypeScript class component with explicit props property — exercises
          // matchesClassProps success path (class has props: ButtonProps so TypeScript
          // type checker finds it and confirms assignability).
          code: `
declare const React: any;
interface ButtonProps {
  label: string;
  color: string;
}
class Button extends React.Component<ButtonProps> {
  props: ButtonProps;
  render() {
    return <button>{this.props.label}</button>;
  }
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: TypeScript class component without explicit props field — exercises
          // matchesClassProps failure path (no props symbol → return false, line 133)
          // and findOwnerByType returning undefined (line 115).
          code: `
declare const React: any;
interface FooProps {
  unusedProp: string;
}
class FooComp extends React.Component<FooProps> {
  render() {
    return <div />;
  }
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: suppression is owner-local. The base component still reports even if
          // a subclass elsewhere forwards whole props to its own custom superclass.
          code: `
declare const React: any;
interface BaseProps {
  used: string;
  unused: string;
}
interface DerivedProps {
  label: string;
}
class UnusedBase extends React.Component<BaseProps> {
  props: BaseProps;
  render() {
    return <div>{this.props.used}</div>;
  }
}
class CustomIntermediateBase extends React.Component<DerivedProps> {}
class DerivedForwarder extends CustomIntermediateBase {
  props: DerivedProps;
  constructor(props: DerivedProps) {
    super(props);
  }
  render() {
    return <div>{this.props.label}</div>;
  }
}
`,
          filename: fixtureFile,
          errors: 1,
        },
      ],
    });
  });
});
