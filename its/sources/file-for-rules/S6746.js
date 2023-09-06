import React from 'react';
class MyComponent extends React.Component {
  constructor() {
    super();
    this.state = {
      count: 0,
    };
  }

  incrementCount() {
    this.state.count++; // Noncompliant
  }

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={this.incrementCount}>Increment</button>
      </div>
    );
  }
}
