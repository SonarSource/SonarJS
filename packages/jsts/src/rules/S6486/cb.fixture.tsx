const React = require('react');
class App extends React.Component {
  const props = {};
  render() {
    [
      <App key="unique id"/>,
      <App key={Math.random()}/>, // Noncompliant {{Do not use generated values for keys of React list components.}}
      <App key={Date.now()}/>, // Noncompliant {{Do not use generated values for keys of React list components.}}
      <App key={`mykey-${Date.now()}`}/>, // Noncompliant {{Do not use generated values for keys of React list components.}}
      <App key={'mykey-' + Date.now()}/>, // Noncompliant {{Do not use generated values for keys of React list components.}}
      <App key={Date.now().toString()}/>, // Noncompliant {{Do not use generated values for keys of React list components.}}
      <App key={String(Date.now())}/>, // Noncompliant {{Do not use generated values for keys of React list components.}}
    ];
  }
}
