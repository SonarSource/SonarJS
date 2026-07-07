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
import { rules } from '../external/react.js';
import {
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import path from 'node:path';

// Sentinel: verify that the upstream ESLint rule still raises on the custom-superclass
// whole-props forwarding pattern that the decorator suppresses.
// If this test starts failing, the upstream rule has been fixed and this decorator path
// can be removed.
describe('S6767 upstream sentinel', () => {
  it('upstream no-unused-prop-types raises when a class forwards props to its own custom superclass', () => {
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'placeholder.tsx');

    ruleTester.run(
      'no-unused-prop-types (upstream, custom superclass super(props))',
      upstreamRule,
      {
        valid: [],
        invalid: [
          {
            // upstream does not treat direct custom-superclass whole-props forwarding as usage
            code: `
declare const React: any;
interface ForwardedCounterProps {
  initialCount: number;
}
class CounterPanelBase extends React.Component<ForwardedCounterProps> {}
class ForwardedCounterPanel extends CounterPanelBase {
  props: ForwardedCounterProps;
  constructor(props: ForwardedCounterProps) {
    super(props);
  }
  render() {
    return <span>ready</span>;
  }
}
`,
            filename: fixtureFile,
            errors: 1,
          },
        ],
      },
    );
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

  it('upstream rule should report forwardRef alias FP pattern (sentinel: remove decorator alias check if this fails)', () => {
    // Confirms that the upstream eslint-plugin-react no-unused-prop-types rule DOES raise
    // issues when the forwardRef callback closes over a local alias of the component props.
    // If this test starts failing, the upstream rule has been fixed and the alias-specific
    // forwardRef handling in the S6767 decorator can be removed.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types (upstream, forwardRef alias)', upstreamRule, {
      valid: [],
      invalid: [
        {
          // upstream does not credit outer component props once they flow through a local alias
          code: `
function Wrapper(props) {
  const forwarded = props;
  const ForwardedInput = React.forwardRef((_, ref) => (
    <label ref={ref}>{forwarded.label}</label>
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

  it('upstream rule should report typed decorator alias FP pattern (sentinel: remove decorator alias check if this fails)', () => {
    // Confirms that the upstream eslint-plugin-react no-unused-prop-types rule DOES raise
    // issues when a typed decorator callback uses a local alias of the component props.
    // If this test starts failing, the upstream rule has been fixed and the alias-specific
    // typed decorator handling in the S6767 decorator can be removed.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'placeholder.tsx');

    ruleTester.run('no-unused-prop-types (upstream, typed decorator alias)', upstreamRule, {
      valid: [],
      invalid: [
        {
          // upstream does not track aliased props inside typed decorator callbacks
          code: `
declare const React: any;
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
  return { screen_name: forwarded.screenName };
})(DecoratorAliasComponent);
`,
          filename: fixtureFile,
          errors: 1,
        },
      ],
    });
  });

  it('upstream rule should report destructured-param binding FP pattern (sentinel: remove decorator check if this fails)', () => {
    // Confirms that the upstream eslint-plugin-react no-unused-prop-types rule DOES raise
    // issues when a destructured first-parameter binding is read in the function body but not
    // registered as used because the callback is not recognized as a component at entry time.
    // If this test starts failing, the upstream rule has been fixed and the
    // hasDestructuredParamPropUsage escape in the S6767 decorator can be removed.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'placeholder.tsx');

    ruleTester.run('no-unused-prop-types (upstream, destructured param binding)', upstreamRule, {
      valid: [],
      invalid: [
        {
          // upstream does not track destructured first-param binding usage in inner callbacks
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
          errors: 1,
        },
      ],
    });
  });

  it('upstream rule should report nested destructured-param binding FP pattern (sentinel: remove decorator check if this fails)', () => {
    // Confirms that the upstream eslint-plugin-react no-unused-prop-types rule DOES raise
    // issues when a prop is consumed via nested destructuring in the first parameter but the
    // callback is not recognized as a component at entry time.
    // If this test starts failing, the upstream rule has been fixed and the nested-ObjectPattern
    // branch of hasDestructuredParamPropUsage can be removed.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'placeholder.tsx');

    ruleTester.run(
      'no-unused-prop-types (upstream, nested destructured param binding)',
      upstreamRule,
      {
        valid: [],
        invalid: [
          {
            // upstream does not track nested destructuring ({ section: { title } }) in inner callbacks
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
            errors: 1,
          },
        ],
      },
    );
  });

  it('upstream rule should NOT report direct class decorator prop access', () => {
    // Characterizes the current upstream behavior for class decorators:
    // direct prop reads inside @screenTrack(...) do not need an S6767 escape.
    const upstreamRule = rules['no-unused-prop-types'];
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'placeholder.tsx');

    ruleTester.run(
      'no-unused-prop-types (upstream, class decorator direct prop access)',
      upstreamRule,
      {
        valid: [
          {
            code: `
declare const React: any;
declare function screenTrack<P>(
  mapper: (props: P) => Record<string, unknown>,
): ClassDecorator;
interface DecoratorAnnotationProps {
  screenName: string;
}
@screenTrack((props: DecoratorAnnotationProps) => ({
  screen_name: props.screenName,
}))
class DecoratorAnnotationComponent extends React.Component<DecoratorAnnotationProps> {
  props: DecoratorAnnotationProps;
  render() {
    return <main />;
  }
}
`,
            filename: fixtureFile,
          },
        ],
        invalid: [],
      },
    );
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
