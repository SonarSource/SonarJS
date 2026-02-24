import React from 'react';
function MyComponent(){
  return ( // Noncompliant: don't use children and dangerouslySetInnerHTML at the same time
      <div dangerouslySetInnerHTML={{ __html: 'HTML' }}>
          Children
      </div>
  );
}
