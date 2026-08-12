import {
  screen as tlScreen,
  waitForElementToBeRemoved as wait,
} from '@testing-library/react';
import * as vueTestingLibrary from '@testing-library/vue';
import {
  screen as pureScreen,
  waitForElementToBeRemoved as pureWait,
} from '@testing-library/react/pure';

await wait(() => tlScreen.getByRole('alert')); // Noncompliant [[get_by!]] {{Use a queryBy* callback so waitForElementToBeRemoved can report a clear error when the element is already absent.}}
//                        ^^^^^^^^^
// edit@get_by [[sc=26;ec=29]] {{query}}
await wait(() => {
  return tlScreen.getAllByRole('alert'); // Noncompliant [[get_all_by!]] {{Use a queryBy* callback so waitForElementToBeRemoved can report a clear error when the element is already absent.}}
});
// edit@get_all_by [[sc=18;ec=21]] {{query}}
await wait(function () {
  return tlScreen.getByText('alert'); // Noncompliant [[get_by_text!]] {{Use a queryBy* callback so waitForElementToBeRemoved can report a clear error when the element is already absent.}}
  // edit@get_by_text [[sc=18;ec=21]] {{query}}
});

await wait(tlScreen.findByRole('alert')); // Noncompliant {{A findBy* query returns a promise, not the element required by this disappearance wait.}}
await wait(tlScreen.findAllByRole('alert')); // Noncompliant {{A findBy* query returns a promise, not the element required by this disappearance wait.}}
await wait(() => tlScreen.findByText('alert')); // Noncompliant {{A findBy* query returns a promise, not the element required by this disappearance wait.}}
await wait(function () {
  return tlScreen.findAllByText('alert'); // Noncompliant {{A findBy* query returns a promise, not the element required by this disappearance wait.}}
});
await wait(() => tlScreen.getByRole('alert')!); // Noncompliant [[get_by_non_null!]] {{Use a queryBy* callback so waitForElementToBeRemoved can report a clear error when the element is already absent.}}
// edit@get_by_non_null [[sc=26;ec=29]] {{query}}
await wait(tlScreen.findByRole('alert') as HTMLElement); // Noncompliant {{A findBy* query returns a promise, not the element required by this disappearance wait.}}
await vueTestingLibrary.waitForElementToBeRemoved(
  () => vueTestingLibrary.screen.findByRole('alert'), // Noncompliant {{A findBy* query returns a promise, not the element required by this disappearance wait.}}
);
await pureWait(() => pureScreen.getAllByRole('alert')); // Noncompliant [[pure_get_all_by!]] {{Use a queryBy* callback so waitForElementToBeRemoved can report a clear error when the element is already absent.}}
// edit@pure_get_all_by [[sc=32;ec=35]] {{query}}

await wait(() => tlScreen.queryByRole('alert'));
await wait(() => tlScreen.queryAllByRole('alert'));
await wait(tlScreen.getByRole('alert'));
await wait(tlScreen.getAllByRole('alert'));
await wait(await tlScreen.findByRole('alert'));
await wait(tlScreen.getByRole('alert'), tlScreen.findAllByRole('alert'));
await wait(() => tlScreen['getByRole']('alert'));
await wait(() => tlScreen?.getByRole('alert'));
await wait(async () => tlScreen.getByRole('alert'));
await wait(function* () {
  return tlScreen.getByRole('alert');
});
await wait(() => {
  const alert = tlScreen.getByRole('alert');
  return alert;
});
await wait(() => (ready ? tlScreen.getByRole('alert') : null));

import { screen as customScreen, waitForElementToBeRemoved as customWait } from './test-utils';
await customWait(() => customScreen.getByRole('alert'));

const localScreen = tlScreen;
const localWait = wait;
await localWait(() => localScreen.getByRole('alert'));

import defaultTestingLibrary from '@testing-library/react';
await defaultTestingLibrary.waitForElementToBeRemoved(
  () => defaultTestingLibrary.screen.getByRole('alert'),
);

const { screen: requiredScreen, waitForElementToBeRemoved: requiredWait } = require(
  '@testing-library/react',
);
await requiredWait(() => requiredScreen.getByRole('alert'));

const requiredNamespace = require('@testing-library/react');
await requiredNamespace.waitForElementToBeRemoved(
  () => requiredNamespace.screen.getByRole('alert'),
);

import { screen as preactScreen, waitForElementToBeRemoved as preactWait } from '@testing-library/preact';
await preactWait(() => preactScreen.getByRole('alert'));

import { screen as nativeScreen, waitForElementToBeRemoved as nativeWait } from '@testing-library/react-native';
await nativeWait(() => nativeScreen.getByRole('alert'));

{
  const wait = (): void => {};
  await wait(() => tlScreen.getByRole('alert'));
}
