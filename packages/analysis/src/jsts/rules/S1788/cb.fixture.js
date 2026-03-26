function multiply(b, a = 1) {}

function multiply(b = 2, a = 1) {}

function appReducer(state = initialState, action) {}

function multiply(a = 1, b) {} // Noncompliant {{Default parameters should be last.}}
//                ^^^^^

function appReducer(state = initialState, action, param) {} // Noncompliant {{Default parameters should be last.}}
//                  ^^^^^^^^^^^^^^^^^^^^

function appReducer(status = initialState, action) {} // Noncompliant {{Default parameters should be last.}}
//                  ^^^^^^^^^^^^^^^^^^^^^
