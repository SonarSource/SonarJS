var obj = {
    key: 'value',
    "key": 'value',

    get key() { return this.key ; },
    set key(p) { this.key = p; }
};

const React = require('react');
class App extends React.Component {
  render() {
    return <Welcome key="John" key="John" />;
  }
}

class C {
  f() { return 42; }
  f() { return true; }
}
