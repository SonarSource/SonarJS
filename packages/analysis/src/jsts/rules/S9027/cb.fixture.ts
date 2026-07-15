import { screen, waitFor } from '@testing-library/react';

expect(screen.queryByRole('dialog')).toBeInTheDocument(); // Noncompliant [[presence!]] {{A presence assertion should use a `getBy*` query so a missing element produces Testing Library diagnostics.}}
// edit@presence [[sc=14;ec=19]] {{get}}

expect(screen.getByRole('dialog')).not.toBeInTheDocument(); // Noncompliant [[absence!]] {{An absence assertion should use a `queryBy*` so it can observe a missing element.}}
// edit@absence [[sc=14;ec=17]] {{query}}

expect(screen.getAllByText('item')[0]).not.toBeDefined(); // Noncompliant [[all!]] {{An absence assertion should use a `queryBy*` so it can observe a missing element.}}
// edit@all [[sc=14;ec=17]] {{query}}

expect(screen.queryAllByRole('dialog').length).toBeTruthy(); // Noncompliant [[length!]] {{A presence assertion should use a `getBy*` query so a missing element produces Testing Library diagnostics.}}
// edit@length [[sc=14;ec=19]] {{get}}

expect(screen.queryByRole('dialog')).toBeDefined(); // Noncompliant [[defined!]] {{A presence assertion should use a `getBy*` query so a missing element produces Testing Library diagnostics.}}
// edit@defined [[sc=14;ec=19]] {{get}}

expect(screen.queryByRole('dialog')).not.toBeNull(); // Noncompliant [[null!]] {{A presence assertion should use a `getBy*` query so a missing element produces Testing Library diagnostics.}}
// edit@null [[sc=14;ec=19]] {{get}}

expect(screen.getByRole('dialog')).toBeFalsy(); // Noncompliant [[falsy!]] {{An absence assertion should use a `queryBy*` so it can observe a missing element.}}
// edit@falsy [[sc=14;ec=17]] {{query}}

expect(screen.getByRole('dialog')).toBeInTheDocument();
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
await waitFor(() => expect(screen.queryByRole('dialog')).toBeInTheDocument());
expect(screen.getByRole('checkbox').checked).toBeFalsy();

import { screen as tlScreen } from '@testing-library/vue';
expect(tlScreen.queryByText('ready')).toBeTruthy(); // Noncompliant [[alias!]] {{A presence assertion should use a `getBy*` query so a missing element produces Testing Library diagnostics.}}
// edit@alias [[sc=16;ec=21]] {{get}}

import * as testingLibrary from '@testing-library/react';
expect(testingLibrary.screen.queryByText('ready')).toBeInTheDocument();

const localScreen = screen;
expect(localScreen.queryByText('ready')).toBeInTheDocument();

function render(screen: { queryByText(text: string): Element | null }) {
  expect(screen.queryByText('ready')).toBeInTheDocument();
}

import { screen as userEventScreen } from '@testing-library/user-event';
expect(userEventScreen.queryByText('ready')).toBeInTheDocument();
