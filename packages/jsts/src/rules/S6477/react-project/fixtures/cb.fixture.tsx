const React = require('react');
class App extends React.Component {
  props = {};
  render() {
    [
      <App key="unique id" />,
      <App {...props} />, // spread operator are an exception
      <App />, // Noncompliant
    ];
  }
}
