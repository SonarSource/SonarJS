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
import { rules } from '../external/react.js';
import { findOwningComponentNode, getComponentIdentifierFromNode } from '../helpers/react.js';
import {
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import type { Rule } from 'eslint';
import type estree from 'estree';
import { describe, it } from 'node:test';
import path from 'node:path';

const ownerLookupRule: Rule.RuleModule = {
  meta: {
    messages: {
      owner: '{{name}}',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      Identifier(node) {
        if (node.name !== 'classes') {
          return;
        }

        const ownerNode = findOwningComponentNode(node as unknown as estree.Node, context);
        const ownerName = ownerNode ? getComponentIdentifierFromNode(ownerNode) : null;

        if (ownerName) {
          context.report({
            node,
            messageId: 'owner',
            data: { name: ownerName },
          });
        }
      },
    };
  },
};

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
        {
          // FP: renamed props parameter is still recognized inside the forwardRef closure
          code: `
function Wrapper(ownProps) {
  const ForwardedButton = forwardRef((_, ref) => (
    <button ref={ref}>{ownProps.label}</button>
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

  it('should only suppress fixed injected props when component is exported via HOC', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [
        {
          // FP: export const named HOC — classes injected by withStyles(), never accessed in render
          code: `
class StyledButton extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
StyledButton.propTypes = {
  classes: PropTypes.object,
  label: PropTypes.string,
};
export const Button = withStyles(styles)(StyledButton);
`,
        },
        {
          // FP: export default HOC — theme injected by withTheme(), never accessed in render
          code: `
class ThemedButton extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
ThemedButton.propTypes = {
  label: PropTypes.string,
  theme: PropTypes.object,
};
export default withTheme(ThemedButton);
`,
        },
        {
          // FP: curried HOC — translation props are injected and may stay unused in render
          code: `
class Greeting extends React.Component {
  render() {
    return <div>{this.props.label}</div>;
  }
}
Greeting.propTypes = {
  i18n: PropTypes.object,
  label: PropTypes.string,
  t: PropTypes.func,
  tReady: PropTypes.bool,
};
export default withTranslation()(Greeting);
`,
        },
        {
          // FP: fixed-prop localization HOC injects getString and may leave it unused in render
          code: `
class LocalizedLabel extends React.Component {
  render() {
    return <span>{this.props.label}</span>;
  }
}
LocalizedLabel.propTypes = {
  getString: PropTypes.func,
  label: PropTypes.string,
};
export default withLocalization(LocalizedLabel);
`,
        },
        {
          // FP: blacklisted wrapper around a fixed-prop wrapper should not widen suppression
          code: `
const MyComponent = class extends React.Component {
  render() {
    return <div>{this.props.label}</div>;
  }
};
MyComponent.propTypes = {
  classes: PropTypes.object,
  label: PropTypes.string,
};
export default React.memo(withStyles(styles)(MyComponent));
`,
        },
      ],
      invalid: [
        {
          // TP: unused prop, no HOC wrapping — must still be reported
          code: `
class Button extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
Button.propTypes = {
  label: PropTypes.string,
  color: PropTypes.string,
};
export default Button;
`,
          errors: 1,
        },
        {
          // TP: unknown wrapper no longer suppresses by callee name alone
          code: `
class MyComponent extends React.Component {
  render() {
    return <ul>{this.props.items.map(i => <li>{i}</li>)}</ul>;
  }
}
MyComponent.propTypes = {
  dispatch: PropTypes.func,
  items: PropTypes.arrayOf(PropTypes.string),
};
function mapStateToProps(state) { return { items: state.items }; }
export default connect(mapStateToProps)(MyComponent);
`,
          errors: 1,
        },
        {
          // TP: fixed-prop wrappers should not silence unrelated genuinely unused props
          code: `
class StyledButton extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
StyledButton.propTypes = {
  classes: PropTypes.object,
  label: PropTypes.string,
  unused: PropTypes.string,
};
export default withStyles(styles)(StyledButton);
`,
          errors: 1,
        },
        {
          // TP: blacklisted wrappers do not suppress by themselves
          code: `
class MemoizedButton extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
MemoizedButton.propTypes = {
  label: PropTypes.string,
  theme: PropTypes.object,
};
export default memo(MemoizedButton);
`,
          errors: 1,
        },
        {
          // TP: observer is also a non-injecting wrapper and must not suppress
          code: `
class ObservedButton extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
ObservedButton.propTypes = {
  label: PropTypes.string,
  theme: PropTypes.object,
};
export default observer(ObservedButton);
`,
          errors: 1,
        },
        {
          // TP: HOC wraps a different component — MyComponent still has an unused prop
          code: `
class MyComponent extends React.Component {
  render() {
    return <div>{this.props.name}</div>;
  }
}
MyComponent.propTypes = {
  name: PropTypes.string,
  unused: PropTypes.string,
};
class OtherComponent extends React.Component {
  render() { return <span />; }
}
OtherComponent.propTypes = {};
export default withTheme(OtherComponent);
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

  it('should only suppress fixed injected props when TypeScript component is exported via HOC', () => {
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
          // FP: TypeScript class — theme is injected by withTheme and unused in render.
          code: `
import React, { Component } from 'react';
interface MyComponentProps {
  items: string[];
  theme: { palette: string };
}
class MyComponent extends Component<MyComponentProps> {
  render() {
    return <ul>{this.props.items.map(i => <li>{i}</li>)}</ul>;
  }
}
declare function withTheme(comp: any): any;
export default withTheme(MyComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: React.FC<Props> arrow function with destructured params exported via Pattern 1.
          // t/i18n/tReady are injected by withTranslation and may stay unused in the body.
          code: `
import React, { type FC } from 'react';
interface TagProps {
  i18n: { language: string };
  tag: string;
  t: (key: string) => string;
  tReady: boolean;
}
const Header: FC<TagProps> = ({ tag }) => <div>{tag}</div>;
declare function withTranslation(): (comp: any) => any;
export default withTranslation()(Header);
`,
          filename: fixtureFile,
        },
        {
          // FP: localization HOC injects getString and should suppress only that fixed prop.
          code: `
import React from 'react';
interface TagProps {
  getString: (id: string) => string;
  tag: string;
}
class Header extends React.Component<TagProps> {
  render() {
    return <div>{this.props.tag}</div>;
  }
}
declare function withLocalization(comp: any): any;
export default withLocalization(Header);
`,
          filename: fixtureFile,
        },
      ],
      invalid: [
        {
          // TP: unknown wrappers are not suppressed by callee name alone
          code: `
declare const React: any;
interface MyComponentProps {
  dispatch: (action: { type: string }) => void;
  items: string[];
}
class MyComponent extends React.Component<MyComponentProps> {
  render() {
    return <ul>{this.props.items.map(i => <li>{i}</li>)}</ul>;
  }
}
declare function connect(mapState: (state: any) => any): (comp: any) => any;
function mapStateToProps(state: { items: string[] }) { return { items: state.items }; }
export default connect(mapStateToProps)(MyComponent);
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: fixed-prop wrappers should not silence unrelated unused props
          code: `
import React from 'react';
interface ArtworkProps {
  artwork: string;
  theme: string;
  unused: string;
}
class SaleArtwork extends React.Component<ArtworkProps> {
  render() {
    return <div>{this.props.artwork}</div>;
  }
}
declare function withTheme(comp: any): any;
export default withTheme(SaleArtwork);
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP boundary: split-export `const Wrapped = hoc(Comp); export { Wrapped }` is NOT
          // a direct HOC export form — the decorator only suppresses direct exports where the
          // HOC call appears inline in the export statement.
          code: `
declare const React: any;
interface MyComponentProps {
  theme: { palette: string };
  items: string[];
}
class MyComponent extends React.Component<MyComponentProps> {
  render() {
    return <ul>{this.props.items.map(i => <li>{i}</li>)}</ul>;
  }
}
declare function withTheme(comp: any): any;
const Wrapped = withTheme(MyComponent);
export { Wrapped };
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP boundary: split-export `const Wrapped = hoc(Comp); export default Wrapped` is
          // NOT a direct HOC export form — the decorator only suppresses direct exports where
          // the HOC call appears inline in the export statement.
          code: `
declare const React: any;
interface MyComponentProps {
  theme: { palette: string };
  items: string[];
}
class MyComponent extends React.Component<MyComponentProps> {
  render() {
    return <ul>{this.props.items.map(i => <li>{i}</li>)}</ul>;
  }
}
declare function withTheme(comp: any): any;
const Wrapped = withTheme(MyComponent);
export default Wrapped;
`,
          filename: fixtureFile,
          errors: 1,
        },
      ],
    });
  });

  it('should resolve TypeScript props owners only from actual React imports', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });

    const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'placeholder.tsx');

    ruleTester.run('owner lookup', ownerLookupRule, {
      valid: [],
      invalid: [
        {
          // The non-React `Component<Props>` import must not steal ownership
          // from the actual React component that uses the shared props interface.
          code: `
import React from 'react';
import { Component } from 'legacy-ui';
interface SharedProps {
  classes: Record<string, string>;
  title: string;
}
class WrappedLegacyView extends Component<SharedProps> {
  render() {
    return <div />;
  }
}
declare function withStyles(styles: object): (comp: any) => any;
const styles = {};
export default withStyles(styles)(WrappedLegacyView);

function ActualReactView(props: SharedProps) {
  return <div>{props.title}</div>;
}
`,
          filename: fixtureFile,
          errors: [{ message: 'ActualReactView' }],
        },
        {
          // The non-React `FunctionComponent<Props>` import must not steal ownership from the actual
          // React component that uses the shared props interface.
          code: `
import React from 'react';
import type { FunctionComponent } from 'legacy-ui';
interface SharedProps {
  classes: Record<string, string>;
  title: string;
}
const WrappedLegacyView: FunctionComponent<SharedProps> = ({ title }) => <div>{title}</div>;
declare function withStyles(styles: object): (comp: any) => any;
const styles = {};
export default withStyles(styles)(WrappedLegacyView);

function ActualReactView(props: SharedProps) {
  return <div>{props.title}</div>;
}
`,
          filename: fixtureFile,
          errors: [{ message: 'ActualReactView' }],
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

  it('upstream rule should report HOC export FP pattern (sentinel: remove decorator check if this fails)', () => {
    // Confirms that the upstream eslint-plugin-react no-unused-prop-types rule DOES raise
    // issues when a prop is declared but unused even though the component is exported via HOC.
    // If this test starts failing, the upstream rule has been fixed and the HOC export
    // suppression in the S6767 decorator can be removed.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types (upstream, HOC export)', upstreamRule, {
      valid: [],
      invalid: [
        {
          // upstream cannot track props injected by HOC — reports dispatch as unused
          code: `
class MyComponent extends React.Component {
  render() {
    return <ul>{this.props.items.map(i => <li>{i}</li>)}</ul>;
  }
}
MyComponent.propTypes = {
  dispatch: PropTypes.func,
  items: PropTypes.arrayOf(PropTypes.string),
};
export default connect()(MyComponent);
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

  it('should handle edge cases in HOC pattern detection', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [],
      invalid: [
        {
          // TP boundary: nested call chains beyond direct HOC application are not recognized
          code: `
class MyComponent extends React.Component {
  render() {
    return <div>{this.props.items.map(i => <li>{i}</li>)}</div>;
  }
}
MyComponent.propTypes = {
  dispatch: PropTypes.func,
  items: PropTypes.arrayOf(PropTypes.string),
};
export default hoc1(hoc2(hoc3(MyComponent)));
`,
          errors: 1,
        },
        {
          // TP: non-CallExpression export — split export not recognized as direct HOC export
          code: `
class Button extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
Button.propTypes = {
  color: PropTypes.string,
  label: PropTypes.string,
};
const wrapped = withRouter(Button);
export default wrapped;
`,
          errors: 1,
        },
      ],
    });
  });

  it('should exclude PropTypes.checkPropTypes from props-delegation suppression', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [
        {
          // FP: PropTypes.checkPropTypes() is explicitly excluded from suppression
          // to allow checking unused props in test/validation code.
          code: `
function validateProps(props) {
  return PropTypes.checkPropTypes({
    label: PropTypes.string,
    color: PropTypes.string,
  }, props, 'prop', 'MyComponent');
}
`,
        },
      ],
      invalid: [],
    });
  });

  it('should suppress unused props in multiple export patterns', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [
        {
          // FP: Multiple named exports with fixed-prop HOCs — only injected props are suppressed
          code: `
class Button extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
Button.propTypes = {
  theme: PropTypes.object,
  label: PropTypes.string,
};

class Input extends React.Component {
  render() {
    return <input value={this.props.value} />;
  }
}
Input.propTypes = {
  t: PropTypes.func,
  value: PropTypes.string,
};

export const WrappedButton = withTheme(Button);
export const WrappedInput = withTranslation()(Input);
`,
        },
        {
          // FP: CommonJS module.exports with fixed-prop HOC
          code: `
class MyComponent extends React.Component {
  render() {
    return <div>{this.props.data}</div>;
  }
}
MyComponent.propTypes = {
  data: PropTypes.object,
  i18n: PropTypes.object,
};
module.exports = withTranslation()(MyComponent);
`,
        },
      ],
      invalid: [
        {
          // TP: Only wrapped component suppressed, not other components in same file
          code: `
class Button extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
Button.propTypes = {
  theme: PropTypes.object,
  label: PropTypes.string,
};

class Input extends React.Component {
  render() {
    return <input value={this.props.value} />;
  }
}
Input.propTypes = {
  size: PropTypes.string,
  value: PropTypes.string,
};

export const WrappedButton = withTheme(Button);
export default Input;
`,
          errors: 1,
        },
        {
          // TP: unknown HOCs in other exports should not suppress
          code: `
class ConnectedCard extends React.Component {
  render() {
    return <div>{this.props.title}</div>;
  }
}
ConnectedCard.propTypes = {
  dispatch: PropTypes.func,
  title: PropTypes.string,
};

class ThemedCard extends React.Component {
  render() {
    return <div>{this.props.title}</div>;
  }
}
ThemedCard.propTypes = {
  theme: PropTypes.object,
  title: PropTypes.string,
};

export const WrappedConnectedCard = connect()(ConnectedCard);
export const WrappedThemedCard = withTheme(ThemedCard);
`,
          errors: 1,
        },
      ],
    });
  });
});
