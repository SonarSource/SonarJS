// Minimal Supertest declarations for checking assertion API provenance.
export interface Test {
  expect(status: number): Test;
  use(plugin: unknown): Test;
}

export default function request(app: unknown): {
  get(url: string): Test;
};
