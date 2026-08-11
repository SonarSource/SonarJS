import { vi as importedVi, vitest as importedVitest } from 'vitest';
import * as ns from 'vitest';
import { vi as otherVi } from 'some-other-module';

vi.mock('global-module');
vitest.mock('global-vitest-module');
importedVi.mock('imported-module');
importedVitest.mock('imported-vitest-module');
ns.vi.mock('namespace-module');
ns.vitest.mock('namespace-vitest-module');

function helper() {
  vi.mock('helper-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  vitest.mock('global-vitest-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  importedVi.mock('imported-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  importedVitest.mock('imported-vitest-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  ns.vi.mock('namespace-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  ns.vitest.mock('namespace-vitest-helper'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
}

const arrowHelper = () => {
  vi.mock('arrow-helper-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
};

[1].forEach(() => {
  vi.mock('callback-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
});

if (condition) {
  vi.mock('conditional-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
}

{
  vi.mock('block-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
}

const initialized = vi.mock('initializer-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}

describe('suite', () => {
  vi.mock('describe-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}

  beforeEach(() => {
    vi.mock('before-each-one'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
    vi.mock('before-each-two'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  });

  beforeAll(() => {
    vi.mock('before-all-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  });

  it('uses a nested mock', async () => {
    vi.mock('test-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
    await import('./runner.js');
  });

  test('uses a runtime mock', () => {
    if (condition) {
      vi.mock('nested-conditional-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
    }
    vi.doMock('runtime-module');
  });
});

vi.mock('outer-module', () => {
  vi.mock('inner-module'); // Noncompliant {{Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.}}
  return {};
});

function localVitest(vi, vitest) {
  vi.mock('local-vi-module');
  vitest.mock('local-vitest-module');
}

function requireDestructuring() {
  const { vi } = require('vitest');
  vi.mock('required-module');
}

function localAlias() {
  const v = vi;
  v.mock('alias-module');
}

function otherImport() {
  otherVi.mock('other-module');
}

vi.doMock('do-mock-module');
vi.unmock('unmock-module');
vi.hoisted(() => {});
vi.mocked(service).mock();
someObject.mock();
vi['mock']('computed-module');
vi?.mock('optional-module');
vi.mock?.('optional-call-module');
ns.mock('namespace-member-module');
