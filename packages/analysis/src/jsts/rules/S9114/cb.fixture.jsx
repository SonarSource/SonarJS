import { debounce } from 'lodash';
import React, { useMemo } from 'react';

function Search() {
  const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
//                 ^^^^^^^^
  return <input onChange={onChange} />;
}

function CompliantSearch() {
  const onChange = useMemo(() => debounce(fetchResults, 300), []);
  return <input onChange={onChange} />;
}

class ClassSearch extends React.Component {
  render() {
    const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
//                   ^^^^^^^^
    return <input onChange={onChange} />;
  }
}

class CompliantClassComponent extends React.Component {
  constructor(props) {
    super(props);
    this.onChange = debounce(fetchResults, 300);
  }

  componentDidMount() {
    const onChange = debounce(fetchResults, 300);
    onChange();
  }

  render() {
    const handleClick = () => debounce(fetchResults, 300);
    return <input onClick={handleClick} />;
  }
}

class NotAReactComponent {
  render() {
    const onChange = debounce(fetchResults, 300);
    return <input onChange={onChange} />;
  }
}
