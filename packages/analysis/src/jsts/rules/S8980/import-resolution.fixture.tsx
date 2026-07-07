import { act } from 'react';
import { act as tlAct, render as testingLibraryRender } from '@testing-library/react';
import { render } from './my-local-render';

function Form() {
    return <button>Submit</button>;
}

// Aliased Testing Library imports must still be resolved by import, not by
// the local binding name, confirming detection is based on where `act`
// actually comes from rather than a hardcoded identifier name `act`.
function aliasedTestingLibraryAct() {
    tlAct(() => { // Noncompliant {{Avoid wrapping Testing Library util calls in `act`}}
        testingLibraryRender(<Form />);
    });
}

// `act` here is React's own `act`, not re-exported by Testing Library. The
// rule only flags `act` calls that themselves resolve to a Testing Library
// (or `react-dom/test-utils`) import, so this stays compliant even though the
// callback body only calls `render`. This documents a known boundary: see
// RSPEC-8980, whose only code example imports `act` from `@testing-library/react`.
function actFromReactWrappingTestingLibraryRender() {
    act(() => {
        testingLibraryRender(<Form />);
    });
}

// `render` here is a same-named local helper, not Testing Library's `render`.
// With aggressive name-based reporting disabled (forced settings in
// decorator.ts), the rule must rely on import resolution only, so a call
// merely named `render` must not be flagged even though `act` itself is a
// genuine Testing Library import (`tlAct`) and would otherwise be checked.
function actWrappingSameNamedNonTestingLibraryCall() {
    tlAct(() => {
        render(<Form />);
    });
}
