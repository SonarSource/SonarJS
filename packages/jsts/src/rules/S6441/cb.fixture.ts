import React from 'react';

class Foo2 extends React.Component {
  handleClick() {} // Noncompliant {{Remove this property or method or refactor "Foo2", as "handleClick" is not used inside component body}}
  render() {
    return null;
  }
}
