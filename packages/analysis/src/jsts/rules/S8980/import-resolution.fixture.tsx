import { act } from 'react';
import { act as tlAct, render as testingLibraryRender } from '@testing-library/react';
import { render } from './my-local-render';
import { act as legacyAct } from 'react-dom/test-utils';

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

// A manual timer delay has no call the rule can positively classify as either
// Testing Library or non-Testing-Library, so the callback must not be flagged
// as "entirely Testing Library calls" purely because it found nothing to the
// contrary. This is a real-world pattern (a `sleep()` test helper).
function actWrappingManualTimerDelay() {
    legacyAct(async () => {
        await new Promise(resolve => {
            setTimeout(resolve, 0);
        });
    });
}
