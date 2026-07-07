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
          // the component and recognizes the whole props object as used.
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
          // matches BarProps to Bar via matchesClassProps and recognizes getStyle(this.props).
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
          // FP: TypeScript class constructor forwards the real props object to a helper.
          code: `
declare const React: any;
interface DialogProps {
  showCoAuthoredBy: boolean;
  coAuthors: string[];
}
declare function createState(props: DialogProps): {
  showCoAuthoredBy: boolean;
  coAuthors: string[];
};
class CommitMessageDialog extends React.Component<DialogProps, ReturnType<typeof createState>> {
  constructor(props: DialogProps) {
    super(props);
    this.state = createState(props);
  }
  render() {
    return <div />;
  }
}
`,
          filename: fixtureFile,
        },
        {
          // FP: TypeScript function component spreads props — Strategy C matches
          // MyComponentProps to MyComponent and recognizes the SpreadElement.
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
          // VictoryAxisProps to VictoryAxis via matchesClassProps and recognizes computed member access.
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
          // FP: wrapped callbacks still resolve through the owning variable, so the
          // forwardRef closure escape continues to suppress WrappedProps.label.
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
        },
        {
          // FP: whole props are only forwarded to the custom superclass, never accessed locally.
          // This isolates hasOwnCustomSuperclassPropsForwarding from other whole-props escapes.
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
          // FP: decorator-factory callback reads typed component props.
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
        {
          // TP: a shared base props declaration can belong to multiple components.
          // The wrapper forwards whole props to the child, but the child still leaves
          // the inherited prop unused, so the report must remain.
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

  it('should not report props used via destructured object parameter binding', () => {
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
          // FP: destructured first-param binding in useCallback — section.title is read
          code: `
declare const React: any;
type SectionItem = { title: string; };
function SectionListComponent() {
  const renderHeader = React.useCallback(
    ({ section }: { section: SectionItem }) => <div>{section.title}</div>,
    [],
  );
  return <div />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: destructured first-param binding in render-prop callback — item.status is read
          code: `
declare const React: any;
type Subscription = { status: string; };
function SubscriptionTable() {
  const columns = [
    { render: ({ item }: { item: Subscription }) => <div>{item.status}</div> },
  ];
  return <div />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: destructured with alias ({ section: sec }) — sec.title is read
          code: `
declare const React: any;
type SectionItem = { title: string; };
function SectionList() {
  const renderHeader = ({ section: sec }: { section: SectionItem }) => <div>{sec.title}</div>;
  return <div />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: destructured with default value ({ count = 0 }) — count is read
          code: `
declare const React: any;
function Counter() {
  const renderCount = ({ count = 0 }: { count: number }) => <span>{count}</span>;
  return <div />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: two-parameter render prop callback — first param is destructured ObjectPattern,
          // second param is ref; both className and style are read in body.
          // Mirrors the ant-design LoadingIcon CSSMotion render prop pattern.
          code: `
declare const React: any;
declare const CSSMotion: any;
function LoadingIcon({ prefixCls }: { prefixCls: string }) {
  return (
    <CSSMotion>
      {({ className, style }: { className?: string; style?: React.CSSProperties }, ref: any) => (
        <span className={className} style={style} ref={ref}>
          <span className={\`\${prefixCls}-icon\`} />
        </span>
      )}
    </CSSMotion>
  );
}
`,
          filename: fixtureFile,
        },
        {
          // FP: first param is an AssignmentPattern (whole-param default value):
          // ({ section }: { section: SectionItem } = {} as any) — exercises the
          // firstParam.type === 'AssignmentPattern' branch (line 47).
          code: `
declare const React: any;
type SectionItem = { title: string; };
function SectionListComponent() {
  const renderHeader = React.useCallback(
    ({ section }: { section: SectionItem } = {} as any) => <div>{section.title}</div>,
    [],
  );
  return <div />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: prop with object-default value ({ item = { label: '' } }) in useCallback —
          // value is AssignmentPattern with Identifier left, exercises lines 66-68.
          code: `
declare const React: any;
function ItemRenderer() {
  const renderItem = React.useCallback(
    ({ item = { label: '' } }: { item: { label: string } }) => <div>{item.label}</div>,
    [],
  );
  return <div />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: nested destructuring ({ section: { title } }) — section is consumed through
          // the first-param destructuring; title (inner binding) is read in the body.
          code: `
declare const React: any;
function SectionListComponent() {
  const renderHeader = React.useCallback(
    ({ section: { title } }: { section: { title: string } }) => <div>{title}</div>,
    [],
  );
  return <div />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: triple nested destructuring ({ section: { nested: { title } } }) — exercises
          // ObjectPattern branch in isBindingRead (lines 36-37); title is read in the body.
          code: `
declare const React: any;
function SectionListComponent() {
  const renderHeader = React.useCallback(
    ({ section: { nested: { title } } }: { section: { nested: { title: string } } }) => <div>{title}</div>,
    [],
  );
  return <div />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: renamed property with default value ({ section: { title: name = 'def' } }) —
          // exercises AssignmentPattern branch in isBindingRead (lines 33-34); name is read.
          code: `
declare const React: any;
function SectionListComponent() {
  const renderHeader = React.useCallback(
    ({ section: { title: name = 'def' } }: { section: { title: string } }) => <div>{name}</div>,
    [],
  );
  return <div />;
}
`,
          filename: fixtureFile,
        },
        {
          // FP: nested ArrayPattern with hole ({ section: { items: [, title] } }) — exercises
          // null element path in isBindingRead (line 28); title (second element) is read.
          code: `
declare const React: any;
function SectionListComponent() {
  const renderHeader = React.useCallback(
    ({ section: { items: [, title] } }: { section: { items: string[] } }) => <div>{title}</div>,
    [],
  );
  return <div />;
}
`,
          filename: fixtureFile,
        },
      ],
      invalid: [],
    });
  });

  it('should report props when destructured via patterns not tracked by isBindingRead', () => {
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
          // TP: rest element inside nested ArrayPattern ({ section: { items: [...rest] } }) —
          // exercises RestElement fall-through in isBindingRead (line 39); section is still reported.
          code: `
declare const React: any;
function SectionListComponent() {
  const renderHeader = React.useCallback(
    ({ section: { items: [...rest] } }: { section: { items: string[] } }) => <div>{rest}</div>,
    [],
  );
  return <div />;
}
`,
          filename: fixtureFile,
          errors: 1,
        },
        {
          // TP: array destructuring for prop value ({ section: [title] }) — exercises else branch
          // in hasDestructuredParamPropUsage (line 113); ArrayPattern value is not suppressed.
          code: `
declare const React: any;
function SectionListComponent() {
  const renderHeader = React.useCallback(
    ({ section: [title] }: { section: string[] }) => <div>{title}</div>,
    [],
  );
  return <div />;
}
`,
          filename: fixtureFile,
          errors: 1,
        },
      ],
    });
  });

  it('should not report narrow local aliases in typed decorator callbacks', () => {
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
          code: `
declare const React: any;
declare function buildPayload<P>(props: P): Record<string, unknown>;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratorAliasProps {
  screenName: string;
}
function DecoratorAliasComponent(props: DecoratorAliasProps) {
  return <main />;
}
track((props: DecoratorAliasProps) => {
  const forwarded = props;
  return buildPayload(forwarded);
})(DecoratorAliasComponent);
`,
          filename: fixtureFile,
        },
        {
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratorNamedPropProps {
  screenName: string;
}
function DecoratorNamedPropComponent(props: DecoratorNamedPropProps) {
  return <main />;
}
track((props: DecoratorNamedPropProps) => {
  const { screenName } = props;
  return { screen_name: screenName };
})(DecoratorNamedPropComponent);
`,
          filename: fixtureFile,
        },
      ],
      invalid: [
        {
          code: `
declare const React: any;
declare function track<P>(
  mapper: (props: P) => Record<string, unknown>,
): <TComponent>(target: TComponent) => TComponent;
interface DecoratorShadowedProps {
  screenName: string;
}
function DecoratorShadowedComponent(props: DecoratorShadowedProps) {
  return <main />;
}
track((props: DecoratorShadowedProps) => {
  const { screenName } = props;
  const value = (() => {
    const screenName = 'shadowed';
    return screenName;
  })();
  return { screen_name: value };
})(DecoratorShadowedComponent);
`,
          filename: fixtureFile,
          errors: [{ message: "'screenName' PropType is defined but prop is never used" }],
        },
      ],
    });
  });
});
