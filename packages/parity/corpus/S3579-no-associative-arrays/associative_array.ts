export {};

const values: string[] = [];
const key = 'name';

// @ts-expect-error Intentional string property assignment for parity coverage.
values[key] = 'bob';
