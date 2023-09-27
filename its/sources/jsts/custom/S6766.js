import React from 'react';
function MyComponent(){
  return (
      <div>
          Click here -> {/* Noncompliant: > can be escaped with &gt; */}
      </div>
  );
}
