import React from 'react';
function MyComponent(){
  return (
    <div role="checkbox">{/* Noncompliant: aria-checked is missing */} Unchecked</div>
  );
}
