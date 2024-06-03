import { runTest } from '../../test';

const code = `
const frappe = {
    ui: {},
    bar: 5
}

(5).toString;

const foo = {}

frappe.ui.init_onboarding_tour = () => {
  foo.bar.x;
}

frappe.ui.init_onboarding_tour();
`;

runTest('t01-01', code);
