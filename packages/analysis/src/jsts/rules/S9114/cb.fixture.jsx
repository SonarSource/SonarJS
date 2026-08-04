import { debounce } from 'lodash';
import React, { useMemo, useRef } from 'react';

function Search() {
  const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or hook, or wrap it in useMemo.}}
//                 ^^^^^^^^
  return <input onChange={onChange} />;
}

function CompliantSearch() {
  const onChange = useMemo(() => debounce(fetchResults, 300), []);
  return <input onChange={onChange} />;
}

function useDebouncedSearch(onSearch) {
  const onChange = debounce(onSearch, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or hook, or wrap it in useMemo.}}
//                 ^^^^^^^^
  return onChange;
}

function useMemoizedSearch(onSearch) {
  return useMemo(() => debounce(onSearch, 300), [onSearch]);
}

function useRefSearch(onSearch) {
  const ref = useRef(null);
  if (!ref.current) {
    ref.current = debounce(onSearch, 300); // Compliant: lazy ref initialization creates the wrapper once
  }
  return ref.current;
}

const MemoizedSearch = React.memo(function Search() {
  const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or hook, or wrap it in useMemo.}}
//                 ^^^^^^^^
  return <input onChange={onChange} />;
});

const ForwardedSearch = React.forwardRef((props, ref) => {
  const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or hook, or wrap it in useMemo.}}
//                 ^^^^^^^^
  return <input ref={ref} onChange={onChange} />;
});

class ClassSearch extends React.Component {
  render() {
    const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Initialize it in the constructor or as an instance property.}}
//                   ^^^^^^^^
    return <input onChange={onChange} />;
  }
}

class ArrowClassSearch extends React.Component {
  render = () => {
    const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Initialize it in the constructor or as an instance property.}}
//                   ^^^^^^^^
    return <input onChange={onChange} />;
  };
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
    const handleClick = () =>
      debounce(fetchResults, 300)(); // Compliant: known limitation, the call is nested inside an event handler
    return <input onClick={handleClick} />;
  }
}

class NotAReactComponent {
  render() {
    const onChange = debounce(fetchResults, 300);
    return <input onChange={onChange} />;
  }
}
