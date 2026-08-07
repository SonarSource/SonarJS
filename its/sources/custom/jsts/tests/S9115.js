import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/dom';

userEvent.click(button); // Noncompliant {{Handle the promise returned by async event method `click` so the test waits for the interaction to finish.}}

const pressEscape = () => userEvent.keyboard('{Escape}');
pressEscape(); // Noncompliant {{Handle the promise returned by `pressEscape` so callers wait for the wrapped interaction to finish.}}

await userEvent.type(input, 'Ada');
await Promise.all([userEvent.hover(button)]);
fireEvent.click(button);
