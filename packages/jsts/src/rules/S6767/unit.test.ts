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
import { rules } from '../external/react.js';
import { NoTypeCheckingRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import path from 'node:path';

describe('S6767', () => {
  it('should not report props passed wholesale to a helper function', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [
        {
          // FP: functional component passes entire props to helper
          code: `
function Button(props) {
  return <button style={getStyle(props)} />;
}
Button.propTypes = {
  color: PropTypes.string,
};
`,
        },
        {
          // FP: class component passes this.props to helper
          code: `
class Bar extends React.Component {
  render() {
    return renderBar(this.props);
  }
}
Bar.propTypes = {
  barRatio: PropTypes.number,
};
`,
        },
        {
          // FP: multiple helpers receiving this.props
          code: `
class BarChart extends React.Component {
  render() {
    return <div style={getStyle(this.props)} width={getWidth(this.props)} />;
  }
}
BarChart.propTypes = {
  barOffset: PropTypes.number,
  barRatio: PropTypes.number,
};
`,
        },
        {
          // FP: static propTypes inside class body with this.props delegation
          // (Strategy A: ClassDeclaration is a direct ancestor of the reported prop)
          code: `
class Button extends React.Component {
  static propTypes = {
    color: PropTypes.string,
  };
  render() {
    return <button style={getStyle(this.props)} />;
  }
}
`,
        },
      ],
      invalid: [
        {
          // TP: prop unused, no wholesale delegation
          code: `
function Button(props) {
  return <button>{props.label}</button>;
}
Button.propTypes = {
  label: PropTypes.string,
  color: PropTypes.string,
};
`,
          errors: 1,
        },
        {
          // TP: super(props) excluded — unused prop still reported
          code: `
class Button extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return <button>Click</button>;
  }
}
Button.propTypes = {
  color: PropTypes.string,
};
`,
          errors: 1,
        },
        {
          // TP: static class propTypes — prop is inside ClassDeclaration (Strategy A in findComponentNode)
          code: `
class Button extends React.Component {
  static propTypes = {
    label: PropTypes.string,
    color: PropTypes.string,
  };
  render() {
    return <button>{this.props.label}</button>;
  }
}
`,
          errors: 1,
        },
      ],
    });
  });

  it('should not report props when spread into a JSX element via JSXSpreadAttribute', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [
        {
          // FP: props forwarded via JSX spread; second object-literal spread resets upstream flag
          code: `
function Wrapper(props) {
  return <div {...props} {...{extra: 'extra-value'}} />;
}
Wrapper.propTypes = {
  onClick: PropTypes.func,
};
`,
        },
        {
          // FP: class component this.props forwarded via JSX spread; second object-literal spread resets upstream flag
          code: `
class MyComponent extends React.Component {
  render() {
    return <Child {...this.props} {...{extra: 'extra-value'}} />;
  }
}
MyComponent.propTypes = {
  onClick: PropTypes.func,
  label: PropTypes.string,
};
`,
        },
      ],
      invalid: [],
    });
  });

  it('should not report props accessed via computed bracket notation', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [
        {
          // FP: props[key] computed access
          code: `
function AnimationComponent(props) {
  const key = 'offsetX';
  return <div value={props[key]} />;
}
AnimationComponent.propTypes = {
  offsetX: PropTypes.number,
};
`,
        },
        {
          // FP: this.props[key] computed access
          code: `
class VictoryAxis extends React.Component {
  render() {
    const key = 'offsetX';
    return <div>{this.props[key]}</div>;
  }
}
VictoryAxis.propTypes = {
  offsetX: PropTypes.number,
};
`,
        },
      ],
      invalid: [],
    });
  });

  it('should not report props accessed via closure inside a forwardRef callback', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [
        {
          // FP: React.forwardRef closure — props used inside the callback via closure
          code: `
function Wrapper(props) {
  const ForwardedInput = React.forwardRef((_, ref) => (
    <label>{props.label}<input ref={ref} /></label>
  ));
  return <ForwardedInput />;
}
Wrapper.propTypes = {
  label: PropTypes.string,
};
`,
        },
        {
          // FP: bare forwardRef closure — props used inside the callback via closure
          code: `
function Wrapper(props) {
  const ForwardedButton = forwardRef((_, ref) => (
    <button ref={ref}>{props.label}</button>
  ));
  return <ForwardedButton />;
}
Wrapper.propTypes = {
  label: PropTypes.string,
};
`,
        },
      ],
      invalid: [
        {
          // TP: suppression is component-scoped; sibling component's unused prop is still reported
          code: `
function WrapperWithForwardRef(props) {
  const FwdComp = React.forwardRef((_, ref) => <div ref={ref}>{props.title}</div>);
  return <FwdComp />;
}
WrapperWithForwardRef.propTypes = {
  title: PropTypes.string,
};
function Button(props) {
  return <button>{props.label}</button>;
}
Button.propTypes = {
  label: PropTypes.string,
  color: PropTypes.string,
};
`,
          errors: 1,
        },
        {
          // TP: forwardRef present, 'label' is referenced inside the callback (suppressed),
          // but 'color' is not — it must still be reported
          code: `
function Wrapper(props) {
  const ForwardedInput = React.forwardRef((_, ref) => (
    <label>{props.label}<input ref={ref} /></label>
  ));
  return <ForwardedInput />;
}
Wrapper.propTypes = {
  label: PropTypes.string,
  color: PropTypes.string,
};
`,
          errors: 1,
        },
      ],
    });
  });

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
          // FP: TypeScript function component with React.forwardRef closure — containsForwardRefCall
          // suppresses the report when the component subtree contains a React.forwardRef call.
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
      ],
    });
  });

  it('upstream rule should report FP pattern (sentinel: remove decorator if this fails)', () => {
    // This test asserts that the upstream eslint-plugin-react no-unused-prop-types
    // rule DOES raise an issue on the wholesale props-delegation pattern.
    // If it starts passing as valid, the upstream rule has been fixed and the
    // S6767 decorator can be removed.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types (upstream)', upstreamRule, {
      valid: [],
      invalid: [
        {
          // upstream cannot track props consumed inside a helper
          code: `
function Button(props) {
  return <button style={getStyle(props)} />;
}
Button.propTypes = { color: PropTypes.string };
`,
          errors: 1,
        },
      ],
    });
  });

  it('upstream rule should report JSX spread FP pattern (sentinel: remove decorator if this fails)', () => {
    // Confirms that the upstream eslint-plugin-react no-unused-prop-types rule DOES raise
    // issues when {...props} or {...this.props} in JSX is followed by an object-literal
    // spread that resets the upstream ignoreUnusedPropTypesValidation flag.
    // If this test starts failing, the upstream rule has been fixed and the JSXSpreadAttribute
    // handling in the S6767 decorator can be removed.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types (upstream, JSX spread)', upstreamRule, {
      valid: [],
      invalid: [
        {
          // upstream resets ignoreUnusedPropTypesValidation when an object-literal spread follows the props spread
          code: `
function Wrapper(props) {
  return <div {...props} {...{extra: 'extra-value'}} />;
}
Wrapper.propTypes = { onClick: PropTypes.func };
`,
          errors: 1,
        },
      ],
    });
  });

  it('upstream rule should report dynamic bracket notation FP pattern (sentinel: remove decorator check if this fails)', () => {
    // Confirms that the upstream eslint-plugin-react no-unused-prop-types rule DOES raise
    // issues when props are accessed via computed bracket notation (props[key], this.props[key]).
    // If this test starts failing, the upstream rule has been fixed and the computed
    // MemberExpression handling in the S6767 decorator can be removed.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types (upstream, bracket notation)', upstreamRule, {
      valid: [],
      invalid: [
        {
          // upstream does not track props[key] computed bracket access
          code: `
function AnimationComponent(props) {
  const key = 'offsetX';
  return <div value={props[key]} />;
}
AnimationComponent.propTypes = {
  offsetX: PropTypes.number,
};
`,
          errors: 1,
        },
      ],
    });
  });

  it('upstream rule should report forwardRef closure FP pattern (sentinel: remove decorator check if this fails)', () => {
    // Confirms that the upstream eslint-plugin-react no-unused-prop-types rule DOES raise
    // issues when props are accessed via closure inside a forwardRef callback.
    // If this test starts failing, the upstream rule has been fixed and the forwardRef
    // handling in the S6767 decorator can be removed.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types (upstream, forwardRef)', upstreamRule, {
      valid: [],
      invalid: [
        {
          // upstream does not credit outer component when props are accessed via closure in forwardRef
          code: `
function Wrapper(props) {
  const ForwardedInput = React.forwardRef((_, ref) => (
    <label>{props.label}</label>
  ));
  return <ForwardedInput />;
}
Wrapper.propTypes = {
  label: PropTypes.string,
};
`,
          errors: 1,
        },
      ],
    });
  });

  it('upstream rule should NOT report state interface properties when TypeScript type info is available', () => {
    // Confirms that the upstream rule uses TypeScript type information to distinguish
    // state types from props types. AnchorState (used as the second type parameter of
    // React.Component) should not be reported as unused props.
    // This explains why the ant-design/Anchor.tsx:70 ruling entry was correctly removed:
    // the upstream rule handles it on its own with TypeScript — the decorator does not
    // need to suppress it.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'placeholder.tsx');

    ruleTester.run('no-unused-prop-types (upstream, with TypeScript)', upstreamRule, {
      valid: [
        {
          // AnchorState is the second type parameter (state), not props — upstream rule
          // correctly does not flag activeLink as an unused prop when type info is present.
          code: `
declare const React: any;
interface AnchorState {
  activeLink: null | string;
}
interface AnchorProps {
  href?: string;
}
class Anchor extends React.Component<AnchorProps, AnchorState> {
  render() {
    const { activeLink } = this.state;
    return <a href={this.props.href}>{activeLink}</a>;
  }
}
`,
          filename: fixtureFile,
        },
      ],
      invalid: [],
    });
  });
});
