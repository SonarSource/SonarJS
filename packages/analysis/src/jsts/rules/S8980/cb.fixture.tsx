import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function Form() {
    return <button>Submit</button>;
}

function submitsForm() {
    act(() => { // Noncompliant {{Remove this redundant `act()` call; the wrapped call already flushes its own updates.}}
        render(<Form />);
    });

    act(() => { // Noncompliant {{Remove this redundant `act()` call; the wrapped call already flushes its own updates.}}
        fireEvent.click(screen.getByRole('button'));
    });

    act(() => screen.getByRole('button')); // Noncompliant {{Remove this redundant `act()` call; the wrapped call already flushes its own updates.}}
}

async function usesUserEventAndWaitFor() {
    await act(async () => { // Noncompliant {{Remove this redundant `act()` call; the wrapped call already flushes its own updates.}}
        await userEvent.click(screen.getByRole('button'));
    });

    await act(async () => { // Noncompliant {{Remove this redundant `act()` call; the wrapped call already flushes its own updates.}}
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
