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
import path from 'node:path/posix';
import { toUnixPath } from '../helpers/index.js';
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const dirname = import.meta.dirname;
const fixtures = path.join(toUnixPath(dirname), 'fixtures');
const filenameReact15 = path.join(fixtures, 'react15/file.js');

process.chdir(import.meta.dirname); // change current working dir to avoid the package.json lookup to up in the tree

describe('S6957', () => {
  it('S6957', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

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

    // JS-536: Test that version ranges (e.g., "^18.0.0") are properly coerced to valid semver
    const filenameReact18Range = path.join(fixtures, 'react18-range/file.js');

    ruleTester.run('React18 with version range', rule, {
      valid: [
        {
          // Non-deprecated code should not be flagged
          code: `
import React from 'react';
const element = <div>Hello</div>;
`,
          filename: filenameReact18Range,
        },
      ],
      invalid: [
        {
          // React 18 deprecations should be flagged when using version range "^18.0.0"
          // This verifies that the version range is properly coerced to "18.0.0"
          code: `
import React from 'react';
import ReactDOM from 'react-dom';

ReactDOM.render(<div></div>, container);
`,
          filename: filenameReact18Range,
          errors: [
            {
              message: 'ReactDOM.render is deprecated since React 18.0.0, use createRoot instead',
            },
          ],
        },
      ],
    });

    // JS-1192: Test that pnpm catalog references (e.g., "catalog:frontend") don't crash the rule
    const filenamePnpmCatalog = path.join(fixtures, 'pnpm-catalog/file.js');

    ruleTester.run('pnpm catalog reference', rule, {
      valid: [
        {
          // When React version cannot be determined (pnpm catalog), non-deprecated code should pass
          code: `
import React from 'react';
const element = <div>Hello</div>;
`,
          filename: filenamePnpmCatalog,
        },
      ],
      invalid: [
        {
          // When React version cannot be determined, the rule should still work
          // (falls back to detecting all deprecations)
          code: `
import React from 'react';
import ReactDOM from 'react-dom';

ReactDOM.render(<div></div>, container);
`,
          filename: filenamePnpmCatalog,
          errors: [
            {
              message: 'ReactDOM.render is deprecated since React 18.0.0, use createRoot instead',
            },
          ],
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
  });
});
