import { vi as importedVi, vitest as importedVitest } from 'vitest';
import * as ns from 'vitest';
import { vi as otherVi } from 'some-other-module';

const value: number = 1;

vi.mock('global-module');
vitest.mock('global-vitest-module');
importedVi.mock('imported-module');
importedVitest.mock('imported-vitest-module');
ns.vi.mock('namespace-module');
ns.vitest.mock('namespace-vitest-module');

function helper(argument: string): void {
  vi.mock('helper-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  vitest.mock('global-vitest-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  importedVi.mock('imported-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  importedVitest.mock('imported-vitest-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  ns.vi.mock('namespace-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  ns.vitest.mock('namespace-vitest-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  void argument;
}

const arrowHelper = (argument: string): void => {
  vi.mock('arrow-helper-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  void argument;
};

describe('suite', (): void => {
  vi.mock('describe-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}

  beforeEach((): void => {
    vi.mock('before-each-one'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
    vi.mock('before-each-two'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  });

  it('uses a nested mock', async (): Promise<void> => {
    vi.mock('test-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
    await import('./runner.js');
  });
});

if (value > 0) {
  vi.mock('conditional-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
}

function localNamespace(vi: { mock(name: string): void }, vitest: { mock(name: string): void }): void {
  vi.mock('local-vi-module');
  vitest.mock('local-vitest-module');
}

function requireDestructuring(): void {
  const { vi } = require('vitest');
  vi.mock('required-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
}

function requireNamespace(): void {
  const vitest = require('vitest');
  vitest.vi.mock('required-namespace-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
}

function otherImport(): void {
  otherVi.mock('other-module');
}

vi.doMock('do-mock-module');
vi.unmock('unmock-module');
vi.hoisted((): void => {});
vi.mocked(service).mock();
someObject.mock();

function destructuredMock(): void {
  const { mock } = vi;
  mock('destructured-module'); // Compliant: destructuring loses the vi/vitest receiver, out of scope
}
