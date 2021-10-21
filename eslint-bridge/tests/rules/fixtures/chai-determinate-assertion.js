const expect = require('chai').expect;
const should = require('chai').should();

describe("uncertain assertions", function() {

    it("uses chai 'expect'", function() {

        expect(foo).to.not.throw(ReferenceError); // Noncompliant {{Refactor this uncertain assertion; it can succeed for multiple reasons.}}
//                     ^^^^^^^^^

        expect(foo).to.not.throw();
        expect(foo).to.throw(ReferenceError);

        expect({a: 42}).to.satisfy(x => x > 42).to.not.include({b: 10, c: 20});  // Noncompliant
//                                                 ^^^^^^^^^^^
        expect({a: 42}).to.not.include({b: 10, c: 20}).to.satisfy(x => x > 42);  // Noncompliant
//                         ^^^^^^^^^^^

        expect({a: 42}).to.include({b: 10, c: 20}).to.not.satisfy(x => x > 42);
        expect({a: 42}).to.include({b: 10, c: 20});
        expect({a: 42}).to.not.include(42);

    //     expect({a: 21}).to.not.have.property('b', 42); // Noncompliant

    //     expect({a: 21}).to.not.have.ownPropertyDescriptor('b', {   // Noncompliant
    //         configurable: true,
    //         enumerable: true,
    //         writable: true,
    //         value: 42,
    //     });

    //     expect([21, 42]).to.not.have.members([1, 2]); // Noncompliant

    //     expect(incThree).to.change(myObj, 'value').by(3); // Noncompliant
    //     expect(decThree).to.change(myObj, 'value').by(3); // Noncompliant

    //     expect(decThree).to.not.increase(myObj, 'value'); // Noncompliant
    //     expect(incThree).to.not.decrease(myObj, 'value'); // Noncompliant

    //     expect(incThree).to.increase(myObj, 'value').but.not.by(1); // Noncompliant

    //     expect(toCheck).to.not.be.finite; // Noncompliant
    });

    it("uses chai 'should'", function() {
        // The same is true for "should" assertions.
        throwsTypeError.should.to.not.throw(ReferenceError); // Noncompliant {{Refactor this uncertain assertion; it can succeed for multiple reasons.}}
        //                        ^^^^^^^^^
        {a: 42}.should.not.include({b: 10, c: 20});  // Noncompliant
        //              ^^^^^^^^^^^
      });
});
