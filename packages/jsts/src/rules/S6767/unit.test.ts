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
          // FP: TypeScript class component with interface, this.props to helper
          code: `
interface BarProps {
  barOffset?: number;
}
class Bar extends React.Component<BarProps> {
  render() {
    return <div style={getStyle(this.props)} />;
  }
}
`,
        },
        {
          // FP: TypeScript functional component, props to helper
          code: `
interface CardProps {
  title: string;
}
function Card(props: CardProps) {
  const { heading } = formatCard(props);
  return <div><h2>{heading}</h2></div>;
}
`,
        },
        {
          // FP: component spreads props into another component
          code: `
interface MyComponentProps {
  color: string;
  size: number;
}
function MyComponent(props: MyComponentProps) {
  return <SomeComponent {...props} />;
}
`,
        },
        {
          // FP: component spreads props with omit utility
          code: `
interface PageProps {
  title: string;
  subtitle: string;
}
function Page(props: PageProps) {
  return <Content {...omit(props, ['title'])} />;
}
`,
        },
        {
          // FP: component spreads props into object literal
          code: `
interface DataProps {
  id: string;
  name: string;
}
function DataComponent(props: DataProps) {
  const merged = { ...props, extra: 'value' };
  return <div>{JSON.stringify(merged)}</div>;
}
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
          // TP: static class propTypes — prop is inside ClassDeclaration (Strategy A in findReactComponentNode)
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
});
