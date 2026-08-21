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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const upstreamRule = rules['no-this-in-sfc'];

// Sentinel: verify that the upstream ESLint rule still raises on the class-component
// arrow callback patterns our decorator suppresses.
describe('S6757 upstream sentinel', () => {
  it('upstream no-this-in-sfc raises on nested class arrow callbacks', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('no-this-in-sfc', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: `
const React = { Component: class {} };

class List extends React.Component {
  render() {
    const Row = item => <button onClick={() => this.select(item)} />;
    return <section>{this.props.items.map(Row)}</section>;
  }
}
          `,
          errors: 1,
        },
      ],
    });
  });
});

describe('S6757', () => {
  it('S6757', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('Stateless functional components should not use `this`', rule, {
      valid: [
        {
          // Compliant: `this` is lexically owned by an ordinary class method.
          code: `
class View {
  render() {
    const Row = item => <span>{this.format(item)}</span>;
    return <section>{[1].map(Row)}</section>;
  }
}
          `,
        },
        {
          // Compliant: arrow closure preserves the ordinary class instance receiver.
          code: `
class NonReactView extends View {
  render() {
    const Row = item => <span>{this.props.format(item)}</span>;
    return <section>{this.items.map(Row)}</section>;
  }
}
          `,
        },
        {
          // Compliant: nested ordinary class member owns the receiver through its arrow closure.
          code: `
const React = { Component: class {} };
class View {}

class Outer extends React.Component {
  render() {
    class Inner extends View {
      draw() {
        const Row = item => <span>{this.props.format(item)}</span>;
        return <section>{this.items.map(Row)}</section>;
      }
    }

    return new Inner().draw();
  }
}
          `,
        },
        {
          // Compliant: class callback
          code: `
const React = { Component: class {} };

class RenderArrowCallbackExample extends React.Component {
  handleSelect(item) {
    return item.id;
  }

  render() {
    const items = [{ id: 1, label: 'alpha' }];
    const Row = item => (
      <button onClick={() => this.handleSelect(item)}>{item.label}</button>
    );

    return <section>{items.map(Row)}</section>;
  }
}
          `,
        },
        {
          // Compliant: class state
          code: `
const Component = class {};

class MethodReturnsArrowRendererExample extends Component {
  renderRow() {
    return item => (
      <tr style={{ width: this.state.columnWidth }}>
        <td>{item.value}</td>
      </tr>
    );
  }

  render() {
    const items = [{ value: 'alpha' }];
    return <table>{items.map(this.renderRow())}</table>;
  }
}
          `,
        },
        {
          // Compliant: class property.
          // Regression guard only: upstream never classifies a class-field arrow as a
          // component, so this case does not reach the decorator. See the next case for
          // actual `PropertyDefinition` coverage.
          code: `
const React = { Component: class {} };

class PropertyArrowRendererExample extends React.Component {
  renderItem = () => (
    <li>{this.props.value}</li>
  );
}
          `,
        },
        {
          // Compliant: an auto-accessor field owns the receiver just like a plain field.
          code: `
class Service {
  accessor make = () => {
    const Row = item => <li>{this.props.format(item)}</li>;
    return Row;
  };
}
          `,
        },
        {
          // Compliant: class-field initializer owns the receiver for the arrow component
          // it builds. Upstream reports here, so this exercises the `PropertyDefinition`
          // branch of the decorator.
          code: `
class Service {
  make = () => {
    const Row = item => <li>{this.props.format(item)}</li>;
    return Row;
  };
}
          `,
        },
        {
          // Compliant: class props
          code: `
const React = { PureComponent: class {} };
const connect = () => Component => Component;

function Entries(props) {
  return <div>{props.entries.length}</div>;
}

class ConnectedNestedComponentExample extends React.PureComponent {
  render() {
    const entries = [{ id: 1 }];
    const EntriesToRender = ({ entries }) => {
      return <Entries entries={entries} history={this.props.history} />;
    };

    return <EntriesToRender entries={entries} />;
  }
}

export default connect()(ConnectedNestedComponentExample);
          `,
        },
        {
          // Compliant: direct PureComponent
          code: `
const PureComponent = class {};

class SettingsPanel extends PureComponent {
  renderItem() {
    const Item = option => (
      <li data-selected={this.props.selected === option.id}>{option.label}</li>
    );
    return this.props.options.map(Item);
  }
}
          `,
        },
      ],
      invalid: [
        {
          // Noncompliant: a computed member key is evaluated in the enclosing component scope,
          // so `this` is the functional component receiver, not the class instance.
          code: `
function MyComponent() {
  class Holder {
    [this.props.key]() {
      return 1;
    }
  }

  return <div>{Holder.name}</div>;
}
          `,
          errors: 1,
        },
        {
          // Noncompliant: same for a computed class-field key.
          code: `
function MyComponent() {
  class Holder {
    [this.props.key] = 1;
  }

  return <div>{Holder.name}</div>;
}
          `,
          errors: 1,
        },
        {
          code: `
function FunctionalComponent() {
  const value = this.props.value;
  return <div>{value}</div>;
}
          `,
          errors: 1,
        },
        {
          // Noncompliant: a nested function declaration creates its own `this`, so the
          // boundary holds in ordinary classes too, not only in React components.
          code: `
class Service {
  build() {
    function Row() {
      return <li>{this.props.value}</li>;
    }

    return <Row />;
  }
}
          `,
          errors: 1,
        },
        {
          code: `
const React = { Component: class {} };

class ComponentWithNestedFunction extends React.Component {
  render() {
    function NestedComponent() {
      return <div>{this.props.label}</div>;
    }

    return <NestedComponent />;
  }
}
          `,
          errors: 1,
        },
      ],
    });
  });
});
