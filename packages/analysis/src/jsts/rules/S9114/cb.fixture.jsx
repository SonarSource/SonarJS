import { debounce } from 'lodash';
import { useMemo } from 'react';

function Search() {
  const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
//                 ^^^^^^^^
  return <input onChange={onChange} />;
}

function CompliantSearch() {
  const onChange = useMemo(() => debounce(fetchResults, 300), []);
  return <input onChange={onChange} />;
}
