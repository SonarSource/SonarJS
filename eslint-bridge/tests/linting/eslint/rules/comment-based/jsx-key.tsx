const React = require('react');
class App extends React.Component {
  const props = {};
  render() {
    [
      <App {...props}/>,
      <App /> // Noncompliant
    ];
  }
}
