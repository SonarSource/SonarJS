import React, { PropTypes, Component } from 'react';
import ReactDOM from 'react-dom';

React.render(<MyComponent />, root);

React.unmountComponentAtNode(root);

React.findDOMNode(this.refs.foo);

React.renderToString(<MyComponent />);

React.renderToStaticMarkup(<MyComponent />);

React.createClass({ /* Class object */ });

const propTypes = {
  foo: PropTypes.bar,
};

//Any factories under React.DOM
React.DOM.div();

class ApiCall extends Component {
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