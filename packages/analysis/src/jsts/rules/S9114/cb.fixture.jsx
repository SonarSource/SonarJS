import { debounce, throttle } from 'lodash';
import React, { useMemo, useRef } from 'react';
import * as ReactNamespace from 'react';
import { useRef as aliasedUseRef } from 'react';

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

function useAliasedRefSearch(onSearch) {
  const ref = aliasedUseRef(null);
  if (!ref.current) {
    ref.current = debounce(onSearch, 300); // Compliant: lazy ref initialization creates the wrapper once
  }
  return ref.current;
}

function CompliantUseRefInitializer() {
  const onChange = useRef(debounce(fetchResults, 300));
  return <input onChange={onChange.current} />;
}

function CompliantNamespaceUseRefInitializer() {
  const onScroll = React.useRef(throttle(updateVolume, 100)).current;
  return <input onScroll={onScroll} />;
}

function CompliantNamespaceImportUseRefInitializer() {
  const onChange = ReactNamespace.useRef(debounce(fetchResults, 300));
  return <input onChange={onChange.current} />;
}

function NestedUseRefInitializer() {
  const onChange = useRef(wrap(debounce(fetchResults, 300))); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or hook, or wrap it in useMemo.}}
//                             ^^^^^^^^
  return <input onChange={onChange.current} />;
}

function NonFirstUseRefArgument() {
  const onChange = useRef(null, debounce(fetchResults, 300)); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or hook, or wrap it in useMemo.}}
//                              ^^^^^^^^
  return <input onChange={onChange.current} />;
}

function LocalUseRefAlias() {
  const localRef = useRef;
  const onChange = localRef(debounce(fetchResults, 300)); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or hook, or wrap it in useMemo.}}
//                          ^^^^^^^^
  return <input onChange={onChange.current} />;
}

function AliasedUseRefImport() {
  const onChange = aliasedUseRef(debounce(fetchResults, 300)); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or hook, or wrap it in useMemo.}}
//                               ^^^^^^^^
  return <input onChange={onChange.current} />;
}

function useLocalRef(value) {
  return useRef(value);
}

function LocalUseRefComponent() {
  const onChange = useLocalRef(debounce(fetchResults, 300)); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or hook, or wrap it in useMemo.}}
//                             ^^^^^^^^
  return <input onChange={onChange} />;
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
