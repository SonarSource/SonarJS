import { render } from '@testing-library/react';
import { act as legacyAct } from 'react-dom/test-utils';

function Form() {
    return <button>Submit</button>;
}

function usesLegacyActImport() {
    legacyAct(() => { // Noncompliant {{Remove this redundant `act()` call; the wrapped call already flushes its own updates.}}
        render(<Form />);
    });
}
