// currentSession.js
import { createSlice } from '@reduxjs/toolkit';
const currentSession = createSlice({
  name: 'currentSession',
  initialState: {
    scenario: 'deactivate',
  },
  reducers: {},
});
const getScenario = state => state.currentSession.scenario;

// Wizard.js
import { useSelector } from 'react-redux';
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

// had to copy this one to make it pass, as the comment-based framework requires at least 1 error
let str = 'str', num = 5;
str === num; // Noncompliant
