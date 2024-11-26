/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import path from 'path/posix';
import { toUnixPath } from '../helpers/index.js';
import { fileURLToPath } from 'node:url';

const dirname = import.meta.dirname;
const fixtures = path.join(toUnixPath(dirname), 'fixtures');
const filenameReact15 = path.join(fixtures, 'react15/file.js');

const tsParserPath = fileURLToPath(import.meta.resolve('@typescript-eslint/parser'));

process.chdir(import.meta.dirname); // change current working dir to avoid the package.json lookup to up in the tree

const ruleTester = new NodeRuleTester({
  parser: tsParserPath,
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

ruleTester.run('React15', rule, {
  valid: [
    {
      code: `
import React from 'react';
import ReactDOM from 'react-dom';

React.createClass({ /* Class object */ });

const propTypes = {
  foo: React.PropTypes.bar,
};

//Any factories under React.DOM
React.DOM.div();

class ApiCall extends React.Component {
// old lifecycles (since React 16.9)
  componentWillMount() {}
  componentWillReceiveProps() {}
  componentWillUpdate() {}
}

// React 18 deprecations
ReactDOM.render(<div></div>, container);

ReactDOM.hydrate(<div></div>, container);

ReactDOM.unmountComponentAtNode(container);

ReactDOMServer.renderToNodeStream(element);
`,
      filename: filenameReact15,
    },
  ],
  invalid: [
    {
      code: `
import React from 'react';
import ReactDOM from 'react-dom';

React.render(<MyComponent />, root);

React.unmountComponentAtNode(root);

React.findDOMNode(this.refs.foo);

React.renderToString(<MyComponent />);

React.renderToStaticMarkup(<MyComponent />);
`,
      filename: filenameReact15,
      errors: 5,
    },
  ],
});

const filenameReact19 = path.join(fixtures, 'react19/file.js');

ruleTester.run('React19', rule, {
  valid: [
    {
      code: `
import React from 'react';
import ReactDOM from 'react-dom';
`,
      filename: filenameReact19,
    },
  ],
  invalid: [
    {
      code: `
import React from 'react';
import ReactDOM from 'react-dom';

React.render(<MyComponent />, root);

React.unmountComponentAtNode(root);

React.findDOMNode(this.refs.foo);

React.renderToString(<MyComponent />);

React.renderToStaticMarkup(<MyComponent />);

React.createClass({ /* Class object */ });

const propTypes = {
  foo: React.PropTypes.bar,
};

//Any factories under React.DOM
React.DOM.div();

class ApiCall extends React.Component {
// old lifecycles (since React 16.9)
  componentWillMount() {}
  componentWillReceiveProps() {}
  componentWillUpdate() {}
}

// React 18 deprecations
ReactDOM.render(<div></div>, container);

ReactDOM.hydrate(<div></div>, container);

ReactDOM.unmountComponentAtNode(container);

ReactDOMServer.renderToNodeStream(element);
`,
      filename: filenameReact19,
      errors: 15,
    },
  ],
});

shouldRaiseAllIssues(path.join(fixtures, 'noreact1/file.js'));
shouldRaiseAllIssues(path.join(fixtures, 'noreact2/file.js'));

function shouldRaiseAllIssues(filename) {
  ruleTester.run(`No React ${filename}`, rule, {
    valid: [
      {
        code: `
import React from 'react';
import ReactDOM from 'react-dom';
`,
        filename,
      },
    ],
    invalid: [
      {
        code: `
import React from 'react';
import ReactDOM from 'react-dom';

React.render(<MyComponent />, root);

React.unmountComponentAtNode(root);

React.findDOMNode(this.refs.foo);

React.renderToString(<MyComponent />);

React.renderToStaticMarkup(<MyComponent />);

React.createClass({ /* Class object */ });

const propTypes = {
  foo: React.PropTypes.bar,
};

//Any factories under React.DOM
React.DOM.div();

class ApiCall extends React.Component {
// old lifecycles (since React 16.9)
  componentWillMount() {}
  componentWillReceiveProps() {}
  componentWillUpdate() {}
}

// React 18 deprecations
ReactDOM.render(<div></div>, container);

ReactDOM.hydrate(<div></div>, container);

ReactDOM.unmountComponentAtNode(container);

ReactDOMServer.renderToNodeStream(element);
`,
        filename,
        errors: 15,
      },
    ],
  });
}
