const initialState = {};

function multiplyDefaultLast(b, a = 1) { return b * a; }

function multiplyBothDefault(b = 2, a = 1) { return b * a; }

function appReducerNamed(state = initialState, action) { return state; }

// Redux reducer with destructured action containing 'type' property
function appReducerWithType(state = initialState, { type }) { return state; }

const dataReducer = (state = null, { type, payload }) => state;

export const isPanelOpen = (state = false, { type, isShowing }) =>
  type === 'SET_IS_SHOWING' ? isShowing : state;

function multiply(a = 1, b) { return a * b; } // Noncompliant {{Move this default parameter last, or callers must pass `undefined`.}}
//                ^^^^^

function appReducer(state = initialState, action, param) { return state; } // Noncompliant {{Move this default parameter last, or callers must pass `undefined`.}}
//                  ^^^^^^^^^^^^^^^^^^^^

function appReducerWrongParam(status = initialState, action) { return status; } // Noncompliant {{Move this default parameter last, or callers must pass `undefined`.}}
//                            ^^^^^^^^^^^^^^^^^^^^^

// Destructured action without 'type' is not a Redux reducer
function notReducer(state = initialState, { payload }) { return state; } // Noncompliant {{Move this default parameter last, or callers must pass `undefined`.}}
//                  ^^^^^^^^^^^^^^^^^^^^
