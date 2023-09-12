import { useState } from 'react';
function useSomething() {
  const [state, , setState] = useState();
  return [state, setState];
}
