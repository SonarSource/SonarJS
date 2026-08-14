vi.mock('module-at-scope');

describe('suite', () => {
  beforeEach(() => {
    vi.mock('module-in-hook-one');
    vi.mock('module-in-hook-two');
  });

  it('uses a nested mock', () => {
    vi.mock('module-in-test');
  });
});

vi.doMock('runtime-module');
