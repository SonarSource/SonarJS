import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function Form() {
    return <button>Submit</button>;
}

function submitsForm() {
    act(() => { // Noncompliant {{Avoid wrapping Testing Library util calls in `act`}}
        render(<Form />);
    });

    act(() => { // Noncompliant {{Avoid wrapping Testing Library util calls in `act`}}
        fireEvent.click(screen.getByRole('button'));
    });

    act(() => screen.getByRole('button')); // Noncompliant {{Avoid wrapping Testing Library util calls in `act`}}
}

async function usesUserEventAndWaitFor() {
    await act(async () => { // Noncompliant {{Avoid wrapping Testing Library util calls in `act`}}
        await userEvent.click(screen.getByRole('button'));
    });

    await act(async () => { // Noncompliant {{Avoid wrapping Testing Library util calls in `act`}}
        await waitFor(() => screen.getByText('done'));
    });
}

function doesNotUseTestingLibrary() {
    render(<Form />);
    fireEvent.click(screen.getByRole('button'));
}

function wrapsNonTestingLibraryCode() {
    act(() => {
        onlyNonTestingLibraryCode();
    });
}

function wrapsMixedContent() {
    act(() => {
        onlyNonTestingLibraryCode();
        render(<Form />);
    });
}

function wrapsEmptyCallback() {
    act(() => {}); // covered by S1186, not by this rule
}

function onlyNonTestingLibraryCode() {}
