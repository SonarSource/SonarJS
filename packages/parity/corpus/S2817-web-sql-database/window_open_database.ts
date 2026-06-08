export {};

const win = window;

// @ts-expect-error Intentional Web SQL usage for parity coverage.
win.openDatabase();
