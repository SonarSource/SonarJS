import React from 'react';
function MyComponent(props){
  const foo = this.props.bar; // Noncompliant: remove 'this'
  return (
      <div>{foo}</div>
  );
}
