import React, { PropTypes, Component } from 'react'; // Noncompliant {{React.PropTypes is deprecated since React 15.5.0, use the npm module prop-types instead}}
//              ^^^^^^^^^
import ReactDOM from 'react-dom';

React.render(<MyComponent />, root); // Noncompliant {{React.render is deprecated since React 0.14.0, use ReactDOM.render instead}}

React.unmountComponentAtNode(root); // Noncompliant {{React.unmountComponentAtNode is deprecated since React 0.14.0, use ReactDOM.unmountComponentAtNode instead}}

React.findDOMNode(this.refs.foo); // Noncompliant {{React.findDOMNode is deprecated since React 0.14.0, use ReactDOM.findDOMNode instead}}

React.renderToString(<MyComponent />); // Noncompliant {{React.renderToString is deprecated since React 0.14.0, use ReactDOMServer.renderToString instead}}

React.renderToStaticMarkup(<MyComponent />); // Noncompliant {{React.renderToStaticMarkup is deprecated since React 0.14.0, use ReactDOMServer.renderToStaticMarkup instead}}

React.createClass({ /* Class object */ }); // Noncompliant {{React.createClass is deprecated since React 15.5.0, use the npm module create-react-class instead}}

const propTypes = {
  foo: PropTypes.bar,
};

//Any factories under React.DOM
React.DOM.div(); // Noncompliant {{React.DOM is deprecated since React 15.6.0, use the npm module react-dom-factories instead}}

class ApiCall extends Component {
// old lifecycles (since React 16.9)
  componentWillMount() {} // Noncompliant {{componentWillMount is deprecated since React 16.9.0, use UNSAFE_componentWillMount instead}}
  componentWillReceiveProps() {} // Noncompliant {{componentWillReceiveProps is deprecated since React 16.9.0, use UNSAFE_componentWillReceiveProps instead}}
  componentWillUpdate() {} // Noncompliant {{componentWillUpdate is deprecated since React 16.9.0, use UNSAFE_componentWillUpdate instead}}
}

// React 18 deprecations
ReactDOM.render(<div></div>, container); // Noncompliant {{ReactDOM.render is deprecated since React 18.0.0, use createRoot instead}}

ReactDOM.hydrate(<div></div>, container); // Noncompliant {{ReactDOM.hydrate is deprecated since React 18.0.0, use hydrateRoot instead}}

ReactDOM.unmountComponentAtNode(container); // Noncompliant {{ReactDOM.unmountComponentAtNode is deprecated since React 18.0.0, use root.unmount instead}}

ReactDOMServer.renderToNodeStream(element); // Noncompliant {{ReactDOMServer.renderToNodeStream is deprecated since React 18.0.0, use renderToPipeableStream instead}}
