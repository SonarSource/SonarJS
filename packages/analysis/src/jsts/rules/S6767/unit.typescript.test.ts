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
          // FP: decorator-factory callback forwards typed props
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
});
