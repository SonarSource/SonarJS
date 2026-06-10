// Hook after a single it() — simplest noncompliant case
describe("user service", () => {
  it("returns list of users", () => {});
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
});

// Hooks before tests — compliant
describe("compliant ordering", () => {
  beforeEach(() => {});
  afterEach(() => {});
  it("a", () => {});
  it("b", () => {});
});

// Two hooks after one it — both reported independently
describe("two misplaced hooks", () => {
  it("a", () => {});
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
  afterEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^
});

// All six hook names exercised
describe("all hook names", () => {
  it("a", () => {});
  beforeAll(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^
  afterAll(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
  afterEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^
  before(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^
  after(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^
});

// Hooks after .only / .skip member-expression test cases
describe("only and skip variants", () => {
  it.only("a", () => {});
  beforeEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^^
});

describe("skip variant", () => {
  test.skip("b", () => {});
  afterEach(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//^^^^^^^^^
});

// Nested describe — inner suite judged independently; outer is compliant
describe("outer", () => {
  beforeEach(() => {});
  it("outer test", () => {});

  describe("inner", () => {
    it("inner test", () => {});
    beforeAll(() => {}); // Noncompliant {{Move this hook above the test cases in the same scope.}}
//  ^^^^^^^^^
  });
});

// Context scope — alias for describe
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
