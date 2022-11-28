const React = require('react');
class App extends React.Component {
  const props = {};
  render() {
    [
      <App key="unique id"/>,
      <App {...props}/>, // spread operator are an exception
      <App /> // Noncompliant
    ];
  }
}
