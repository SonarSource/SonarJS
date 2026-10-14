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
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const upstreamRule = rules['no-this-in-sfc'];

const prototypeMethod = `
function Parser(tokens) { this.tokens = tokens; }
Parser.prototype.parse = function Parse() {
  if (!this.tokens.length) return null;
  return this.tokens[0];
};
`;

const typedThisHelpers = [
  `function transformNode(this: PipelineContext, node: unknown) {
    return this.visit(node);
  }`,
  `const transformNode = function(this: PipelineContext, node: unknown) {
    return this.visit(node);
  };`,
  `const transformer = {
    transformNode(this: PipelineContext, node: unknown) {
      return this.visit(node);
    }
  };
  const transformNode = transformer.transformNode;`,
  `function transformNode(this: PipelineContext, node: unknown) {
    const visit = () => this.visit(node);
    return visit();
  }`,
  `function transformNode(this: PipelineContext, node: unknown) {
    const Row = () => <span>{this.visit(node)}</span>;
    return <Row />;
  }`,
];

const typedThisCases = typedThisHelpers.flatMap(helper =>
  [
    'export function NodeBadge(props: { node: unknown; ctx: PipelineContext })',
    'export const NodeBadge = (props: { node: unknown; ctx: PipelineContext }) =>',
  ].map(component => ({
    code: `
interface PipelineContext {
  visit(node: unknown): string;
}
${component} {
  ${helper}
  return <span>{transformNode.call(props.ctx, props.node)}</span>;
}
`,
  })),
);

const typedThisCreateElementComponents = [
  {
    code: `
function Row(this: { label: string }) {
  return h.createElement('li', null, this.label);
}
`,
    settings: { react: { pragma: 'h' } },
    errors: 1,
  },
  {
    code: `
function Row(this: { label: string }) {
  return React.createElement('li', null, this.label);
}
`,
    errors: 1,
  },
  {
    code: `
import { createElement } from 'react';
const Row = function(this: { label: string }) {
  return createElement('li', null, this.label);
};
`,
    errors: 1,
  },
  {
    code: `
function Row(this: { label: string }) {
  const readLabel = () => this.label;
  return React.createElement('li', null, readLabel());
}
`,
    errors: 1,
  },
];

const typedThisElementCreationHelpers = [
  {
    code: `
function App() {
  function BuildElement(this: { label: string }) {
    const element = document.createElement('li');
    element.textContent = this.label;
    return element;
  }
  return <div>{BuildElement.call({ label: 'test' })}</div>;
}
`,
  },
  {
    code: `
function App() {
  function BuildRenderer(this: { label: string }) {
    const Row = () => React.createElement('li', null, this.label);
    return Row;
  }
  const Row = BuildRenderer.call({ label: 'test' });
  return <Row />;
}
`,
  },
];

describe('S6757 typed this parameters', () => {
  it('uses the nearest ordinary function receiver and preserves it through arrows', () => {
    new NoTypeCheckingRuleTester().run(
      'Stateless functional components should not use `this`',
      rule,
      {
        valid: [
          ...typedThisCases,
          ...typedThisElementCreationHelpers,
          {
            // A helper alongside a component is also compliant.
            code: `
function transformNode(this: { visit(node: unknown): string }, node: unknown) {
  return this.visit(node);
}
function NodeBadge() { return <span />; }
`,
          },
          {
            // A typed receiver also applies when the target name is capitalized.
            code: `
Parser.prototype.Parse = function Parse(this: { tokens: unknown[] }) {
  if (!this.tokens.length) return null;
  return null;
};
`,
          },
          {
            // JSX in a nested arrow does not turn a typed helper into a component.
            code: `
function App() {
  function BuildRenderer(this: { label: string }) {
    const Row = () => <li>{this.label}</li>;
    return Row;
  }
  const Row = BuildRenderer.call({ label: 'test' });
  return <Row />;
}
`,
          },
        ],
        invalid: [
          ...typedThisCreateElementComponents,
          {
            // A typed receiver does not make `this` available when React calls a component.
            code: `
function Row(this: { label: string }) {
  return <li>{this.label}</li>;
}
const App = () => <Row />;
`,
            errors: 1,
          },
          {
            // The variable name determines whether a function expression is a component.
            code: `
const Row = function renderRow(this: { label: string }) {
  return <>{this.label}</>;
};
const App = () => <Row />;
`,
            errors: 1,
          },
          {
            // Member assignments use the target's component name too.
            code: `
const components = {};
components.Row = function(this: { label: string }) {
  return <li>{this.label}</li>;
};
const App = () => <components.Row />;
`,
            errors: 1,
          },
          {
            // Arrow callbacks inherit the component's unavailable receiver.
            code: `
function Row(this: { label: string }) {
  const readLabel = () => this.label;
  return <li>{readLabel()}</li>;
}
const App = () => <Row />;
`,
            errors: 1,
          },
          {
            // A nested component's own typed receiver must not hide its issue.
            code: `
function App() {
  function Row(this: { label: string }) {
    return <li>{this.label}</li>;
  }
  return <Row />;
}
`,
            errors: 1,
          },
          {
            // An anonymous default export can also be a component.
            code: `
export default function(this: { label: string }) {
  return <li>{this.label}</li>;
}
`,
            errors: 1,
          },
          {
            code: `
export function Widget(props: { label: string }) {
  function Row() { return <li>{this.props.label}</li>; }
  return <Row />;
}
`,
            errors: 1,
          },
          {
            code: `
export function FunctionalComponent() {
  const value = this.props.value;
  return <div>{value}</div>;
}
`,
            errors: 1,
          },
          {
            code: `
export function Panel() {
  const Row = () => <li>{this.props.x}</li>;
  return <Row />;
}
`,
            errors: 1,
          },
          {
            code: `
export function Legacy(props: { x: number }) {
  function helper(this) { return this.x; }
  return <div>{helper.call(props)}</div>;
}
`,
            errors: 1,
          },
          {
            // A nested ordinary function does not inherit its parent's typed receiver.
            code: `
export function Widget() {
  function helper(this: { label: string }) {
    const Row = function () { return <li>{this.props.label}</li>; };
    return <Row />;
  }
  return <div>{helper.call({ label: 'test' })}</div>;
}
`,
            errors: 1,
          },
        ],
      },
    );
  });
});

describe('S6757 member assignments', () => {
  for (const Tester of [DefaultParserRuleTester, NoTypeCheckingRuleTester]) {
    it(`respects the assignment target with ${Tester.name}`, () => {
      new Tester().run('Stateless functional components should not use `this`', rule, {
        valid: [
          { code: prototypeMethod },
          { code: prototypeMethod.replace('.parse =', '._parse =') },
          { code: prototypeMethod.replace('function Parse()', 'function ()') },
          {
            code: `
const parser = {};
parser.parse = function Parse() {
  const read = () => this.tokens[0];
  if (!this.tokens.length) return null;
  return read();
};
`,
          },
          {
            code: `
class Parser {
  parse() {
    if (!this.tokens.length) return null;
    return this.tokens[0];
  }
}
`,
          },
        ],
        invalid: [
          {
            code: `
function Widget(props) {
  const v = this.props.value;
  if (!v) return null;
  return null;
}
`,
            errors: 1,
          },
          ...['function ()', 'function Parse()'].map(fn => ({
            code: `Parser.prototype.Parse = ${fn} {
  if (!this.tokens.length) return null;
  return null;
};`,
            errors: 1,
          })),
          { code: prototypeMethod.replace('.parse =', '.__Parse ='), errors: 2 },
          {
            code: 'const Widget = props => <div>{this.props.label}</div>;',
            errors: 1,
          },
          {
            code: 'function Widget() { return <div>{this.props.label}</div>; }',
            errors: 1,
          },
          {
            code: `
module.exports = function Widget() {
  if (!this.props.v) return null;
  return null;
};
`,
            errors: 1,
          },
          {
            // A nested component has its own receiver, even inside a prototype method.
            code: `
Parser.prototype.parse = function Parse() {
  function Widget() { return <div>{this.props.label}</div>; }
  return null;
};
`,
            errors: 1,
          },
        ],
      });
    });
  }
});

// Sentinel: verify that upstream still reports the patterns our decorator suppresses.
describe('S6757 upstream sentinel', () => {
  it('upstream no-this-in-sfc raises on typed helpers, prototype methods and class arrow callbacks', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('no-this-in-sfc', upstreamRule, {
      valid: [],
      invalid: [
        ...typedThisCases.map(testCase => ({ ...testCase, errors: 1 })),
        ...typedThisCreateElementComponents,
        ...typedThisElementCreationHelpers.map(testCase => ({ ...testCase, errors: 1 })),
        { code: prototypeMethod, errors: 2 },
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
          // Compliant: getter owns the receiver through its arrow closure.
          code: `
class View {
  get rows() {
    const Row = item => <span>{this.format(item)}</span>;
    return <section>{[1].map(Row)}</section>;
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
          // Noncompliant: computed auto-accessor keys are evaluated in the enclosing scope.
          code: `
function MyComponent() {
  class Holder {
    accessor [this.props.key] = 1;
  }

  return <div>{Holder.name}</div>;
}
          `,
          errors: 1,
        },
        {
          // Noncompliant: static blocks currently do not own the receiver.
          code: `
function MyComponent() {
  class Holder {
    static {
      this.x;
    }
  }

  return <div>{Holder.name}</div>;
}
          `,
          errors: 1,
        },
        {
          // Noncompliant: member decorators are evaluated in the enclosing scope.
          code: `
function MyComponent() {
  class Holder {
    @this.decorate
    field = 1;
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
          // Noncompliant: a function expression creates its own receiver boundary.
          code: `
class Service {
  build() {
    const Row = function () {
      return <li>{this.props.value}</li>;
    };

    return <Row />;
  }
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
