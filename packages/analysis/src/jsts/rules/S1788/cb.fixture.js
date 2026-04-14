function multiply(b, a = 1) {}

function multiply(b = 2, a = 1) {}

function appReducer(state = initialState, action) {}

// Redux reducer with destructured action containing 'type' property
function appReducer(state = initialState, { type }) {}

const dataReducer = (state = null, { type, payload }) => {};

export const isPanelOpen = (state = false, { type, isShowing }) =>
  type === 'SET_IS_SHOWING' ? isShowing : state;

function multiply(a = 1, b) {} // Noncompliant {{Default parameters should be last.}}
//                ^^^^^

function appReducer(state = initialState, action, param) {} // Noncompliant {{Default parameters should be last.}}
//                  ^^^^^^^^^^^^^^^^^^^^

function appReducer(status = initialState, action) {} // Noncompliant {{Default parameters should be last.}}
//                  ^^^^^^^^^^^^^^^^^^^^^

// Destructured action without 'type' is not a Redux reducer
function notReducer(state = initialState, { payload }) {} // Noncompliant {{Default parameters should be last.}}
//                  ^^^^^^^^^^^^^^^^^^^^
