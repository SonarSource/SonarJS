vi.mock('module-at-scope');

describe('suite', () => {
  it('uses a nested mock', () => {
    vi.mock('module-in-test');
  });

  beforeEach(() => {
    vi.mock('module-in-hook-one');
    vi.mock('module-in-hook-two');
  });
});

vi.doMock('runtime-module');
