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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
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
          // TP: builtin React superclass constructor forwarding is not a suppression case
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
});
