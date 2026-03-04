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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

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
      ],
    });
  });
});
