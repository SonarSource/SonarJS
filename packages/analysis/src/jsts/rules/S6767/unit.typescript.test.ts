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
        {
          // FP: upstream can misreport the second React class type parameter when a
          // third type parameter is also present. The decorator suppresses these
          // non-props generic declarations explicitly.
          code: `
declare const React: any;
interface AnchorState {
  activeLink: null | string;
}
interface AnchorProps {
  href?: string;
}
interface AnchorSnapshot {
  scrollTop: number;
}
class Anchor extends React.Component<AnchorProps, AnchorState, AnchorSnapshot> {
  render() {
    const { activeLink } = this.state;
    return <a href={this.props.href}>{activeLink}</a>;
  }
}
`,
          filename: fixtureFile,
        },
        {
          // FP: decorator-factory callback uses props
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratorFactoryProps {
  contextModule: string;
  userId: string;
}
function DecoratorFactoryComponent(props: DecoratorFactoryProps) {
  return <div />;
}
track((props: DecoratorFactoryProps) => ({
  context_module: props.contextModule,
  user_id: props.userId,
}))(DecoratorFactoryComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: identical generic alias instantiations with `any` type arguments
          // must still count as the same declared props type.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
type Box<T> = {
  contextModule: string;
  payload: T;
};
function AnyGenericComponent(props: Box<any>) {
  return <div>{String(props.payload)}</div>;
}
track((props: Box<any>) => ({
  context_module: props.contextModule,
}))(AnyGenericComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: identical generic alias instantiations with `unknown` type arguments
          // must still count as the same declared props type.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
type Box<T> = {
  contextModule: string;
  payload: T;
};
function UnknownGenericComponent(props: Box<unknown>) {
  return <div>{String(props.payload)}</div>;
}
track((props: Box<unknown>) => ({
  context_module: props.contextModule,
}))(UnknownGenericComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: nested generic instantiations stay equal when their innermost type
          // argument is an alias to `any`.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
type AnyAlias = any;
type Inner<T> = {
  value: T;
};
type Box<T> = {
  contextModule: string;
  payload: T;
};
function NestedAnyAliasComponent(props: Box<Inner<AnyAlias>>) {
  return <div>{String(props.payload.value)}</div>;
}
track((props: Box<Inner<AnyAlias>>) => ({
  context_module: props.contextModule,
}))(NestedAnyAliasComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: identical generic alias instantiations with primitive type arguments
          // must still count as the same declared props type.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
type Box<T> = {
  contextModule: string;
  payload: T;
};
function PrimitiveGenericComponent(props: Box<string>) {
  return <div>{props.payload}</div>;
}
track((props: Box<string>) => ({
  context_module: props.contextModule,
}))(PrimitiveGenericComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: identical generic alias instantiations with anonymous object type
          // arguments must still count as the same declared props type.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
type Box<T> = {
  contextModule: string;
  payload: T;
};
function ObjectGenericComponent(props: Box<{ x: number }>) {
  return <div>{props.payload.x}</div>;
}
track((props: Box<{ x: number }>) => ({
  context_module: props.contextModule,
}))(ObjectGenericComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: decorator-factory callback uses outer binding of named function expression
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface NamedExpressionProps {
  label: string;
  contextModule: string;
}
const WrappedComponent = function InnerWrappedComponent(props: NamedExpressionProps) {
  return <div>{props.label}</div>;
};
track((props: NamedExpressionProps) => ({
  context_module: props.contextModule,
}))(WrappedComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: parenthesized aliases and quoted member keys still resolve back to the
          // reported enclosing type and reported type member.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface SharedLiteralProps {
  'data-id': string;
}
type WrappedLiteralProps = (SharedLiteralProps);
function LiteralKeyComponent(props: WrappedLiteralProps) {
  return <div />;
}
track((props: SharedLiteralProps) => ({
  data_id: props['data-id'],
}))(LiteralKeyComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: method-signature props follow the same reported type member path as
          // property signatures.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface CallbackProps {
  onSelect(): void;
}
function CallbackComponent(props: CallbackProps) {
  return <div />;
}
track((props: CallbackProps) => ({
  on_select: props.onSelect,
}))(CallbackComponent);
`,
          filename: fixtureFile,
        },
        {
          // Compliant: upstream tracks class decorator member reads
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratorAnnotationProps {
  contextModule: string;
  userId: string;
}
@track((props: DecoratorAnnotationProps) => ({
  context_module: props.contextModule,
  user_id: props.userId,
}))
class DecoratorAnnotationComponent extends React.Component<DecoratorAnnotationProps> {
  props: DecoratorAnnotationProps;
  render() {
    return <div />;
  }
}
`,
          filename: fixtureFile,
        },
        {
          // FP: decorator-factory callback forwards typed props to a helper.
          code: `
declare const React: any;
declare function buildPayload<P>(props: P): Record<string, unknown>;
declare function screenTrack<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratorHelperProps {
  screenName: string;
}
function DecoratorHelperComponent(props: DecoratorHelperProps) {
  return <main />;
}
screenTrack(function (props: DecoratorHelperProps) {
  return buildPayload(props);
})(DecoratorHelperComponent);
`,
          filename: fixtureFile,
        },
        {
          // FP: class decorator callback forwards typed props
          code: `
declare const React: any;
declare function buildPayload<P>(props: P): Record<string, unknown>;
declare function screenTrack<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratorAnnotationHelperProps {
  screenName: string;
}
@screenTrack(function (props: DecoratorAnnotationHelperProps) {
  return buildPayload(props);
})
class DecoratorAnnotationHelperComponent extends React.Component<DecoratorAnnotationHelperProps> {
  props: DecoratorAnnotationHelperProps;
  render() {
    return <main />;
  }
}
`,
          filename: fixtureFile,
        },
      ],
      invalid: [
        {
          // TP after removing the legacy single-owner fallback: the anonymous
          // React.memo callback is no longer recovered as a component owner, so
          // the forwardRef closure escape does not run and WrappedProps.label
          // is reported again.
          code: `
declare const React: any;
interface WrappedProps {
  label: string;
}
const Wrapped = React.memo(function (props: WrappedProps) {
  const ForwardedInput = React.forwardRef((_: any, ref: any) => (
    <label ref={ref}>{props.label}</label>
  ));
  return <ForwardedInput />;
});
`,
          filename: fixtureFile,
          errors: 1,
        },
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
          // TP: default anonymous function component has no component identifier.
          code: `
declare const React: any;
interface DefaultProps {
  used: string;
  unused: string;
}
export default function (props: DefaultProps) {
  return <div>{props.used}</div>;
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: named function expression remains reportable without decorator usage.
          code: `
declare const React: any;
interface FunctionExpressionProps {
  used: string;
  unused: string;
}
const FunctionExpressionComponent = function InnerFunctionExpression(
  props: FunctionExpressionProps,
) {
  return <div>{props.used}</div>;
};
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
        {
          // TP: a mixed props/state declaration must keep the props-side report
          // even when the state-owning class appears first in source order.
          code: `
declare const React: any;
interface SharedType {
  unused: string;
}
interface Snapshot {
  scrollTop: number;
}
class StateOwner extends React.Component<{}, SharedType, Snapshot> {
  render() {
    return <div>{this.state.unused}</div>;
  }
}
class PropsOwner extends React.Component<SharedType> {
  render() {
    return <div />;
  }
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: the non-props safeguard stays local to state/snapshot usage and
          // must not suppress when the same declaration is used as props elsewhere.
          code: `
declare const React: any;
interface SharedType {
  unused: string;
}
interface Snapshot {
  scrollTop: number;
}
class PropsOwner extends React.Component<SharedType> {
  render() {
    return <div />;
  }
}
class StateOwner extends React.Component<{}, SharedType, Snapshot> {
  render() {
    return <div>{this.state.unused}</div>;
  }
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: wrapped props contracts still count as props, so a class that also
          // reuses the same declaration for state must keep the props-side report.
          code: `
declare const React: any;
interface SharedType {
  unused: string;
}
interface Snapshot {
  scrollTop: number;
}
class WrappedPropsOwner extends React.Component<Readonly<SharedType>, SharedType, Snapshot> {
  render() {
    return <div>{this.state.unused}</div>;
  }
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: a shared base props declaration can belong to multiple components.
          // The wrapper forwards whole props to the child, but the child still leaves
          // the inherited prop unused. The decorator must keep the issue unless every
          // owning component matches an FP suppression pattern.
          code: `
import * as React from 'react';
interface SharedProps {
  relay: string;
}
interface ChildProps extends SharedProps {
  title: string;
}
const SavedSearchesList: React.FC<ChildProps> = props => {
  const { title } = props;
  return <div>{title}</div>;
};
const SavedSearchesListWrapper: React.FC<SharedProps> = props => {
  const { relay } = props;
  return <div data-id={relay}><SavedSearchesList {...props} title="x" /></div>;
};
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: an exact shared props contract can belong to both a destructuring React.FC
          // and a class component that forwards whole props. The issue must remain until
          // every owner proves the prop is consumed through an FP remediation pattern.
          code: `
import * as React from 'react';
interface PageWrapperProps {
  moduleName: string;
  viewProps: { isVisible: boolean };
}
const InnerPageWrapper: React.FC<PageWrapperProps> = ({ viewProps }) => {
  return <div>{String(viewProps.isVisible)}</div>;
};
class PageWrapper extends React.Component<PageWrapperProps> {
  componentDidUpdate() {
    if (this.props.moduleName === 'Map') {
      return;
    }
  }
  render() {
    return <InnerPageWrapper {...this.props} />;
  }
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: unrelated decorator callback
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratedProps {
  contextModule: string;
}
interface PlainProps {
  title: string;
  color: string;
}
function DecoratedComponent(props: DecoratedProps) {
  return <div />;
}
track((props: DecoratedProps) => ({
  context_module: props.contextModule,
}))(DecoratedComponent);
function PlainComponent(props: PlainProps) {
  return <div>{props.title}</div>;
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: decorator-factory application with extra outer arguments is not the
          // conservative one-target pattern that this escape recognizes.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent, ...extraArgs: unknown[]) => TComponent;
interface DecoratedProps {
  contextModule: string;
}
function DecoratedComponent(props: DecoratedProps) {
  return <div />;
}
track((props: DecoratedProps) => ({
  context_module: props.contextModule,
}))(DecoratedComponent, { unexpected: true });
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: decorator callback parameter is not the component props type.
          code: `
declare const React: any;
declare function decorate<TMetadata>(
  mapper: (metadata: TMetadata) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratedProps {
  contextModule: string;
}
interface Metadata {
  contextModule: string;
}
function DecoratedComponent(props: DecoratedProps) {
  return <div />;
}
decorate((metadata: Metadata) => ({
  context_module: metadata.contextModule,
}))(DecoratedComponent);
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: a generic alias with a different instantiation is not the same props type.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface UserEntity {
  userName: string;
}
interface ProductEntity {
  sku: string;
}
type WithEntity<T> = {
  id: string;
  data: T;
};
function ComponentA(props: WithEntity<UserEntity>) {
  return <div>{props.data.userName}</div>;
}
track((props: WithEntity<ProductEntity>) => ({
  id: props.id,
}))(ComponentA);
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: class decorator callback forwards metadata, not component props.
          code: `
declare const React: any;
declare function buildPayload<TMetadata>(metadata: TMetadata): Record<string, unknown>;
declare function decorate<TMetadata>(
  mapper: (metadata: TMetadata) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratedProps {
  contextModule: string;
}
interface Metadata {
  contextModule: string;
}
@decorate((metadata: Metadata) => buildPayload(metadata))
class DecoratedComponent extends React.Component<DecoratedProps> {
  props: DecoratedProps;
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

  it('should not report anonymous default-export component props used via forwardRef closure', () => {
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
          // Regression: anonymous default-export components still own typed props
          // even though their component identifier is attached later in analysis.
          code: `
declare const React: any;
interface Props {
  label: string;
}
export default function (props: Props) {
  const ForwardedInput = React.forwardRef((_: any, ref: any) => (
    <label ref={ref}>{props.label}</label>
  ));
  return <ForwardedInput />;
}
`,
          filename: fixtureFile,
        },
      ],
      invalid: [],
    });
  });

  it('should report props when a decorator target only matches a shadowed local binding', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });

    const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'placeholder.tsx');

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [],
      invalid: [
        {
          // Regression: the decorator callback matches the component props type,
          // but the applied target is a nested shadowing binding, not the component.
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface Props {
  label: string;
  userId: string;
}
function Comp(props: Props) {
  {
    const Comp = 0;
    track((decoratedProps: Props) => ({
      user_id: decoratedProps.userId,
    }))(Comp);
  }
  return <div>{props.label}</div>;
}
`,
          filename: fixtureFile,
          errors: 1,
        },
      ],
    });
  });
});
