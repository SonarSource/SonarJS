import { screen, waitForElementToBeRemoved } from '@testing-library/dom';

await waitForElementToBeRemoved(() => screen.getByRole('alert'));
await waitForElementToBeRemoved(screen.findByRole('alert'));
await waitForElementToBeRemoved(function () {
  return screen.findAllByRole('alert');
});
