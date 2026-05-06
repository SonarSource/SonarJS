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
          // Compliant: class property
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
          code: `
function FunctionalComponent() {
  const value = this.props.value;
  return <div>{value}</div>;
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
        {
          code: `
class NonReactView extends View {
  render() {
    const Row = item => <span>{this.props.format(item)}</span>;
    return <section>{this.items.map(Row)}</section>;
  }
}
          `,
          errors: 1,
        },
      ],
    });
  });
});
