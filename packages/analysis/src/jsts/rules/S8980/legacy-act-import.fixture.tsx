import { render } from '@testing-library/react';
import { act as legacyAct } from 'react-dom/test-utils';

function Form() {
    return <button>Submit</button>;
}

function usesLegacyActImport() {
    legacyAct(() => { // Noncompliant {{Avoid wrapping Testing Library util calls in `act`}}
        render(<Form />);
    });
}
