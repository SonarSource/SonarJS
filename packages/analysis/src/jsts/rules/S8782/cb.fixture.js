// before-hook after a test — noncompliant; after-hook at bottom — compliant
describe("user service", () => {
  it("returns list of users", () => {});
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
  afterEach(() => {});
});

// Hooks before tests — compliant
describe("compliant: all hooks at top", () => {
  beforeEach(() => {});
  afterEach(() => {});
  it("a", () => {});
  it("b", () => {});
});

// after-hooks at the bottom of the suite — compliant
describe("compliant: after-hooks at bottom", () => {
  beforeEach(() => {});
  it("a", () => {});
  it("b", () => {});
  afterEach(() => {});
  afterAll(() => {});
  after(() => {});
});

// Two hooks after a single it() — before-hook flagged, after-hook compliant at bottom
describe("mixed hooks after last test", () => {
  it("a", () => {});
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
  afterEach(() => {});
});

// All hook names between two tests — every hook is noncompliant
describe("all hook names between tests", () => {
  it("a", () => {});
  beforeAll(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^
  afterAll(() => {}); // Noncompliant {{Move this hook above or below the test cases in the same scope.}}
//^^^^^^^^
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
  afterEach(() => {}); // Noncompliant {{Move this hook above or below the test cases in the same scope.}}
//^^^^^^^^^
  before(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^
  after(() => {}); // Noncompliant {{Move this hook above or below the test cases in the same scope.}}
//^^^^^
  it("b", () => {});
});

// before-hook after .only test case
describe("only and skip variants", () => {
  it.only("a", () => {});
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
});

// after-hook trailing a .skip test case — compliant
describe("skip variant", () => {
  test.skip("b", () => {});
  afterEach(() => {});
});

// Nested describe — inner suite judged independently
describe("outer", () => {
  beforeEach(() => {});
  it("outer test", () => {});

  describe("inner", () => {
    it("inner test", () => {});
    beforeAll(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//  ^^^^^^^^^
  });
});

// context scope — alias for describe
context("context scope", () => {
  it("a", () => {});
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
});

// specify also counts as a test case
describe("specify is a test case", () => {
  specify("a", () => {});
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
});

// Hook at module top level — not flagged (no enclosing describe)
beforeEach(() => {});
it("top-level test", () => {});

// Hook inside if-block — not a direct child of the suite body, not flagged
describe("conditional hook", () => {
  it("a", () => {});
  if (process.env.DEBUG) {
    beforeEach(() => {});
  }
});

// Concise arrow callback — no BlockStatement, not flagged
describe("concise body", () => it("a", () => {}));

// Suite with only hooks — compliant (no test cases to come after)
describe("only hooks", () => {
  beforeEach(() => {});
  afterEach(() => {});
});

// Suite with only tests — compliant (no hooks at all)
describe("only tests", () => {
  it("a", () => {});
  it("b", () => {});
});

// before-hook after the last test — still noncompliant even with no later tests
describe("before-hook after last test", () => {
  it("a", () => {});
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
});

// after-hook between two tests — noncompliant
describe("after-hook interleaved", () => {
  it("a", () => {});
  afterEach(() => {}); // Noncompliant {{Move this hook above or below the test cases in the same scope.}}
//^^^^^^^^^
  it("b", () => {});
});

// after-hooks split top + bottom (tie) — flag the bottom (tie-breaker)
describe("after-hooks split: tie", () => {
  afterEach(() => {});
  it("a", () => {});
  afterEach(() => {}); // Noncompliant {{Group this hook with the other after-hooks in the same scope.}}
//^^^^^^^^^
});

// after-hooks split, more at top — flag the bottom minority
describe("after-hooks split: top majority", () => {
  afterEach(() => {});
  afterAll(() => {});
  it("a", () => {});
  after(() => {}); // Noncompliant {{Group this hook with the other after-hooks in the same scope.}}
//^^^^^
});

// after-hooks split, more at bottom — flag the top minority
describe("after-hooks split: bottom majority", () => {
  afterEach(() => {}); // Noncompliant {{Group this hook with the other after-hooks in the same scope.}}
//^^^^^^^^^
  it("a", () => {});
  afterEach(() => {});
  afterAll(() => {});
});

// Nested describes count as suite positions — hook between them is interleaved
describe("hook between nested suites", () => {
  describe("group a", () => { it("a", () => {}); });
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
  describe("group b", () => { it("b", () => {}); });
});

// after-hook between nested suites — interleaved variant
describe("after-hook between nested suites", () => {
  describe("group a", () => { it("a", () => {}); });
  afterEach(() => {}); // Noncompliant {{Move this hook above or below the test cases in the same scope.}}
//^^^^^^^^^
  describe("group b", () => { it("b", () => {}); });
});

// after-hook after a trailing nested suite — compliant (bottom position)
describe("after-hook after trailing suite", () => {
  describe("group a", () => { it("a", () => {}); });
  afterEach(() => {});
});