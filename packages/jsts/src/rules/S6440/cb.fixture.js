// Test when there's no React import detected.
(function() {
  function useState(name) {
    return [name, n => n];
  }

  function useEffect(fn) {
    fn();
  }

  function Form() {
    const [name, setName] = useState('Mary');
    if (name !== '') {
      useEffect(function persistForm() {
        console.log('persistForm');
      });
    }
    return <button onClick={() => setName("Poppins")}>Supercali...</button>
  }

  return Form;
})();

import { useEffect, useState } from 'react';

function Form() {
  const [name, setName] = useState('Mary');
  if (name !== '') {
    useEffect(function persistForm() { // Noncompliant {{React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render.}}
//  ^^^^^^^^^
      console.log('persistForm');
    });
  }
  return <button onClick={() => setName("Poppins")}>Supercali...</button>;
}
