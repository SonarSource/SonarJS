const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('chai').should();


describe("invalid comparisons", function() {
    const aNumber = new Number(42);

    it("uses chai 'assert'", function() {
      assert.fail(42, aNumber);  //Noncompliant [[qf1]]
      // edit@qf1 {{      assert.fail(aNumber, 42);}}
      assert //Noncompliant@+3 [[qf_complex_edit]]
        .fail(
          42,
          aNumber
        );
      // edit@qf_complex_edit@-1 {{          aNumber,}}
      // edit@qf_complex_edit {{          42}}

      assert.equal(42,
                 //^^> {{Other argument to swap.}}
        aNumber); // Noncompliant {{Swap these 2 arguments so they are in the correct order: assert.equal(actual, expected).}}
      //^^^^^^^
      assert.notEqual(42, aNumber); // Noncompliant
      assert.strictEqual(42, aNumber); // Noncompliant
      assert.notStrictEqual(42, aNumber); // Noncompliant
      assert.deepEqual(42, aNumber); // Noncompliant
      assert.notDeepEqual(42, aNumber); // Noncompliant
      assert.closeTo(42, aNumber, 0.1); // Noncompliant
      assert.approximately(42, aNumber, 0.1); // Noncompliant
      assert.fail(  42  , aNumber + (anotherNumber * someNumber()), );//Noncompliant [[qf2]]
      // edit@qf2 {{      assert.fail(  aNumber + (anotherNumber * someNumber())  , 42, );}}
      assert.fail(aNumber, 42); // Compliant
    });

    it("uses chai 'expect'", function() {
      expect(42).to.equal(
           //^^> {{Other argument to swap.}}
        aNumber); // Noncompliant {{Swap these 2 arguments so they are in the correct order: expect(actual).to.equal(expected).}}
      //^^^^^^^
      expect(42).to.be.equal(aNumber); // Noncompliant
      expect(42).to.not.equal(aNumber); // Noncompliant
      expect(42).to.eql(aNumber); // Noncompliant
      expect(42).to.not.eql(aNumber); // Noncompliant
      expect(42).to.be.closeTo(aNumber, 0.1); // Noncompliant
      expect.fail(42, aNumber); // Noncompliant
    });

    it("uses chai 'should'", function() {
      should.fail(42,
                //^^> {{Other argument to swap.}}
        aNumber); // Noncompliant {{Swap these 2 arguments so they are in the correct order: should.fail(actual, expected).}}
      //^^^^^^^
    });

    it("should increase coverage", function() {
      should.succeed(42, aNumber);
      expect(42).to.nothing(aNumber);
      expect(42).to.do.nothing(aNumber);
    });
});
