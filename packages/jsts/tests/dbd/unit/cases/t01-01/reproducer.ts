import { runTest } from '../../test';

const code = `const window = {
    watchMedia: () => {
        return "(min-device-width: 992px)";
    }
}
const frappe = {
    ui: {},
    boot: {
        user: {},
    },
    router: {
        current_route: undefined,
    },
}

frappe.ui.init_onboarding_tour = () => {
  // As of now Tours are only for desktop as it is annoying on mobile.
  // Also lot of elements are hidden on mobile so until we find a better way to do it.
  //if (!window.matchMedia("(min-device-width: 992px)").matches) return; // removed as not relevant
  // typeof frappe.boot.onboarding_tours == "undefined" && frappe.boot.onboarding_tours == [];
  // typeof frappe.boot.user.onboarding_status == "undefined" &&
  // frappe.boot.user.onboarding_status == {};
  let route = frappe.router.current_route;
  if (route[0] === "") return; // Noncompliant: route can be undefined
}

frappe.ui.init_onboarding_tour();
`;

runTest('t01-01', code);
