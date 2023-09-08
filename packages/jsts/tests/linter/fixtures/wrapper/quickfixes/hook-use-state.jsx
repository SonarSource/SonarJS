import { useState } from 'react';
function MyComponent() {
  const [state, , setState] = useState();
  return [state, setState];
}
