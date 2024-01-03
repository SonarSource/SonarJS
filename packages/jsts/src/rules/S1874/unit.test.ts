/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { RuleTester } from 'eslint';
import { rule } from './';
import path from 'path';
import { getAllPackageJsons, searchPackageJsonFiles } from '@sonar/jsts';

//reset and search package.json files in rule dir
getAllPackageJsons().clear();
searchPackageJsonFiles(__dirname, []);

const fixtures = path.join(__dirname, 'fixtures');
const filenameReact15 = path.join(fixtures, 'react15/file.js');

const tsParserPath = require.resolve('@typescript-eslint/parser');
const ruleTester = new RuleTester({
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
