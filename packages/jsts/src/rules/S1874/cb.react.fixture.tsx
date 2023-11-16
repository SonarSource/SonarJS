import React, { PropTypes, Component } from 'react'; // Noncompliant
//              ^^^^^^^^^
import ReactDOM from 'react-dom';

React.render(<MyComponent />, root); // Noncompliant {{React.render is deprecated since React 0.14.0, use ReactDOM.render instead}}

React.unmountComponentAtNode(root); // Noncompliant

React.findDOMNode(this.refs.foo); // Noncompliant

React.renderToString(<MyComponent />); // Noncompliant

React.renderToStaticMarkup(<MyComponent />); // Noncompliant

React.createClass({ /* Class object */ }); // Noncompliant

const propTypes = {
  foo: PropTypes.bar,
};

//Any factories under React.DOM
React.DOM.div(); // Noncompliant

class ApiCall extends Component {
// old lifecycles (since React 16.9)
  componentWillMount() {} // Noncompliant
  componentWillReceiveProps() {} // Noncompliant
  componentWillUpdate() {} // Noncompliant
}

// React 18 deprecations
ReactDOM.render(<div></div>, container); // Noncompliant

ReactDOM.hydrate(<div></div>, container); // Noncompliant

ReactDOM.unmountComponentAtNode(container); // Noncompliant

ReactDOMServer.renderToNodeStream(element); // Noncompliant
