import { useSelector } from 'react-redux';
import { getScenario } from './currentSession';
function Wizard() {
  const currentScenario = useSelector(getScenario);
  const doThing = () => {
    if (currentScenario === 'deactivate') { // Fail: Remove this "===" check; it will always be false. Did you mean to use "=="?
      console.log('deactivate');
    } else {
      console.log('other scenario');
    }
  };
};

let str = 'str', num = 5;
str === num;
