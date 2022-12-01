const React = require('react');
class App extends React.Component {
  const props = {};
  render() {
    [
      <App key="unique id"/>,
      <App key={Math.random()}/>, // Noncompliant
      <App key={Date.now()}/>, // Noncompliant
      <App key={`mykey-${Date.now()}`}/>, // Noncompliant
      <App key={'mykey-' + Date.now()}/>, // Noncompliant
      <App key={Date.now().toString()}/>, // Noncompliant
      <App key={String(Date.now())}/>, // Noncompliant
    ];
  }
}
