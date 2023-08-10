import React from 'react';

const SomeContext = React.createContext();

function Component() {
  return (
    <SomeContext.Provider value={{foo: 'bar'}}> { /* Noncompliant {{The object passed as the value prop to the Context provider changes every render. To fix this consider wrapping it in a useMemo hook.}} */ }
{ /*                             ^^^^^^^^^^^^ */ }
      <SomeComponent />
    </SomeContext.Provider>
  );
}
