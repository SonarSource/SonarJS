import { debounce } from 'lodash';
import React, { useMemo } from 'react';

interface SearchProps {
  onSearch: (query: string) => void;
}

function Search({ onSearch }: SearchProps) {
  const onChange: (query: string) => void = debounce(onSearch, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
//                                          ^^^^^^^^
  return null;
}

const TypedArrow = ({ onSearch }: SearchProps): null => {
  const onChange = debounce(onSearch, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
  return null;
};

const TypedFC: React.FC<SearchProps> = ({ onSearch }) => {
  const onChange = debounce(onSearch, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
//                 ^^^^^^^^
  return null;
};

function CompliantTyped({ onSearch }: SearchProps) {
  const onChange = useMemo(() => debounce(onSearch, 300), [onSearch]);
  return null;
}
