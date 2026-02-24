import * as React from 'react';
class MyComponent extends React.Component {
    componentDidMount() {
      mydatastore.subscribe(this);
    }
    dataHandler() {
      if (this.isMounted()) { // Noncompliant: isMounted() hides the error
        //...
      }
    }
    render() {
        //...
    }
};
