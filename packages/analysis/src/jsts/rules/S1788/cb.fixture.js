const initialState = {};

function multiplyDefaultLast(b, a = 1) { return b * a; }

function multiplyBothDefault(b = 2, a = 1) { return b * a; }

function appReducerNamed(state = initialState, action) { return state; }

// Redux reducer with destructured action containing 'type' property
function appReducerWithType(state = initialState, { type }) { return state; }

const dataReducer = (state = null, { type, payload }) => state;

export const isPanelOpen = (state = false, { type, isShowing }) =>
  type === 'SET_IS_SHOWING' ? isShowing : state;

function multiply(a = 1, b) { return a * b; } // Noncompliant {{Default parameters should be last.}}
//                ^^^^^

function appReducer(state = initialState, action, param) { return state; } // Noncompliant {{Default parameters should be last.}}
//                  ^^^^^^^^^^^^^^^^^^^^

function appReducerWrongParam(status = initialState, action) { return status; } // Noncompliant {{Default parameters should be last.}}
//                            ^^^^^^^^^^^^^^^^^^^^^

// Destructured action without 'type' is not a Redux reducer
function notReducer(state = initialState, { payload }) { return state; } // Noncompliant {{Default parameters should be last.}}
//                  ^^^^^^^^^^^^^^^^^^^^
