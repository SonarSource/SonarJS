import { render, screen, within } from '@testing-library/react';

test('awaits a screen sync query', async () => {
  const button = await screen.getByRole('button', { name: 'Submit' });
  expect(button).toBeVisible();
});

test('awaits a render sync query', async () => {
  const { queryAllByRole } = render(ui);
  const rows = await queryAllByRole('row');
  expect(rows).toHaveLength(2);
});

test('awaits a within sync query', async () => {
  const block = screen.getByTestId('reusable-block');
  const image = await within(block).getByLabelText('Image Block. Row 1');
  expect(image).toBeVisible();
});

test('compliant sync and async queries', async () => {
  const button = screen.getByRole('button', { name: 'Submit' });
  const status = await screen.findByRole('status', { name: 'Saved' });
  expect(button).toBeVisible();
  expect(status).toBeVisible();
});
