describe.only("only on root describe"); // Noncompliant [[qf1]] {{Remove ".only()" from your test case.}}
//       ^^^^
// fix@qf1 {{Remove ."only()".}}
// edit@qf1 {{describe("only on root describe");}}

describe("no exclusive tests", function() {
    describe.only("a describe with a .only()", function () { // Noncompliant [[qf2]] {{Remove ".only()" from your test case.}}
//           ^^^^
// fix@qf2 {{Remove ."only()".}}
// edit@qf2 {{    describe("a describe with a .only()", function ()}}
    });
    it.only("is an 'it' statement using .only()", function () { // Noncompliant [[qf3]] {{Remove ".only()" from your test case.}}
//     ^^^^
// fix@qf3 {{Remove ."only()".}}
// edit@qf3 {{    it("is an 'it' statement using .only()", function ()}}
    });
    test.only("is a 'test' statement using .only()", function () { // Noncompliant [[qf4]] {{Remove ".only()" from your test case.}}
//       ^^^^
// fix@qf4 {{Remove ."only()".}}
// edit@qf4 {{    test("is a 'test' statement using .only()", function ()}}
    });
    it// skipping a line here
    .only("should be flagged with a comment slipped in the middle."); // Noncompliant [[qf5]] {{Remove ".only()" from your test case.}}
//   ^^^^
// fix@qf5 {{Remove ."only()".}}
// edit@qf5 [[sc=4;ec=9]] {{}}

    context.only("is a Cypress context using .only()", function () {}); // Noncompliant [[qf6]] {{Remove ".only()" from your test case.}}
//          ^^^^
// fix@qf6 {{Remove ."only()".}}
// edit@qf6 {{    context("is a Cypress context using .only()", function () {});}}
    specify.only("is a Cypress test using .only()", function () {}); // Noncompliant [[qf7]] {{Remove ".only()" from your test case.}}
//          ^^^^
// fix@qf7 {{Remove ."only()".}}
// edit@qf7 {{    specify("is a Cypress test using .only()", function () {});}}
    test.describe.only("is a Playwright suite using .only()", () => {}); // Noncompliant [[qf8]] {{Remove ".only()" from your test case.}}
//                ^^^^
// fix@qf8 {{Remove ."only()".}}
// edit@qf8 {{    test.describe("is a Playwright suite using .only()", () => {});}}
    test.describe.parallel.only("is a Playwright parallel suite using .only()", () => {}); // Noncompliant [[qf9]] {{Remove ".only()" from your test case.}}
//                         ^^^^
// fix@qf9 {{Remove ."only()".}}
// edit@qf9 {{    test.describe.parallel("is a Playwright parallel suite using .only()", () => {});}}
    test.describe.serial.only("is a Playwright serial suite using .only()", () => {}); // Noncompliant [[qf10]] {{Remove ".only()" from your test case.}}
//                       ^^^^
// fix@qf10 {{Remove ."only()".}}
// edit@qf10 {{    test.describe.serial("is a Playwright serial suite using .only()", () => {});}}

    it("works fine");
});

describe.skip();

function only() {}
only();

const someObject = {
    only: () => {}
};
someObject.only();
