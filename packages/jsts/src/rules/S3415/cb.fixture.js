const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('chai').should();


describe("invalid comparisons", function() {
    const aNumber = new Number(42);

    it("uses chai 'assert'", function() {
      assert.fail(42, aNumber);  //Noncompliant [[qf1]] {{Swap these 2 arguments so they are in the correct order: assert.fail(actual, expected).}}
      // edit@qf1 {{      assert.fail(aNumber, 42);}}
      // fix@qf1 {{Swap arguments}}
      assert //Noncompliant@+3 [[qf2]] {{Swap these 2 arguments so they are in the correct order: assert.fail(actual, expected).}}
        .fail(
          42,
          aNumber
        );
      // edit@qf2@-1 {{          aNumber,}}
      // edit@qf2 {{          42}}
      // fix@qf2 {{Swap arguments}}

      assert.equal(42,
                 //^^> {{Other argument to swap.}}
        aNumber); // Noncompliant [[qf11]] {{Swap these 2 arguments so they are in the correct order: assert.equal(actual, expected).}}
      //^^^^^^^
      // edit@qf11@-2 {{      assert.equal(aNumber,}}
      // edit@qf11 {{        42);}}
      // fix@qf11 {{Swap arguments}}
      assert.notEqual(42, aNumber); // Noncompliant [[qf3]] {{Swap these 2 arguments so they are in the correct order: assert.notEqual(actual, expected).}}
      // edit@qf3 {{      assert.notEqual(aNumber, 42);}}
      // fix@qf3 {{Swap arguments}}
      assert.strictEqual(42, aNumber); // Noncompliant [[qf4]] {{Swap these 2 arguments so they are in the correct order: assert.strictEqual(actual, expected).}}
      // edit@qf4 {{      assert.strictEqual(aNumber, 42);}}
      // fix@qf4 {{Swap arguments}}
      assert.notStrictEqual(42, aNumber); // Noncompliant [[qf5]] {{Swap these 2 arguments so they are in the correct order: assert.notStrictEqual(actual, expected).}}
      // edit@qf5 {{      assert.notStrictEqual(aNumber, 42);}}
      // fix@qf5 {{Swap arguments}}
      assert.deepEqual(42, aNumber); // Noncompliant [[qf6]] {{Swap these 2 arguments so they are in the correct order: assert.deepEqual(actual, expected).}}
      // edit@qf6 {{      assert.deepEqual(aNumber, 42);}}
      // fix@qf6 {{Swap arguments}}
      assert.notDeepEqual(42, aNumber); // Noncompliant [[qf7]] {{Swap these 2 arguments so they are in the correct order: assert.notDeepEqual(actual, expected).}}
      // edit@qf7 {{      assert.notDeepEqual(aNumber, 42);}}
      // fix@qf7 {{Swap arguments}}
      assert.closeTo(42, aNumber, 0.1); // Noncompliant [[qf8]] {{Swap these 2 arguments so they are in the correct order: assert.closeTo(actual, expected).}}
      // edit@qf8 {{      assert.closeTo(aNumber, 42, 0.1);}}
      // fix@qf8 {{Swap arguments}}
      assert.approximately(42, aNumber, 0.1); // Noncompliant [[qf9]] {{Swap these 2 arguments so they are in the correct order: assert.approximately(actual, expected).}}
      // edit@qf9 {{      assert.approximately(aNumber, 42, 0.1);}}
      // fix@qf9 {{Swap arguments}}
      assert.fail(  42  , aNumber + (anotherNumber * someNumber()), );//Noncompliant [[qf10]] {{Swap these 2 arguments so they are in the correct order: assert.fail(actual, expected).}}
      // edit@qf10 {{      assert.fail(  aNumber + (anotherNumber * someNumber())  , 42, );}}
      // fix@qf10 {{Swap arguments}}
      assert.fail(aNumber, 42); // Compliant
    });

    it("uses chai 'expect'", function() {
      expect(42).to.equal(
           //^^> {{Other argument to swap.}}
        aNumber); // Noncompliant [[qf12]] {{Swap these 2 arguments so they are in the correct order: expect(actual).to.equal(expected).}}
      //^^^^^^^
      // edit@qf12@-2 {{      expect(aNumber).to.equal(}}
      // edit@qf12 {{        42);}}
      // fix@qf12 {{Swap arguments}}
      expect(42).to.be.equal(aNumber); // Noncompliant [[qf13]] {{Swap these 2 arguments so they are in the correct order: expect(actual).to.equal(expected).}}
      // edit@qf13 {{      expect(aNumber).to.be.equal(42);}}
      // fix@qf13 {{Swap arguments}}
      expect(42).to.not.equal(aNumber); // Noncompliant [[qf14]] {{Swap these 2 arguments so they are in the correct order: expect(actual).to.equal(expected).}}
      // edit@qf14 {{      expect(aNumber).to.not.equal(42);}}
      // fix@qf14 {{Swap arguments}}
      expect(42).to.eql(aNumber); // Noncompliant [[qf15]] {{Swap these 2 arguments so they are in the correct order: expect(actual).to.eql(expected).}}
      // edit@qf15 {{      expect(aNumber).to.eql(42);}}
      // fix@qf15 {{Swap arguments}}
      expect(42).to.not.eql(aNumber); // Noncompliant [[qf16]] {{Swap these 2 arguments so they are in the correct order: expect(actual).to.eql(expected).}}
      // edit@qf16 {{      expect(aNumber).to.not.eql(42);}}
      // fix@qf16 {{Swap arguments}}
      expect(42).to.be.closeTo(aNumber, 0.1); // Noncompliant [[qf17]] {{Swap these 2 arguments so they are in the correct order: expect(actual).to.closeTo(expected).}}
      // edit@qf17 {{      expect(aNumber).to.be.closeTo(42, 0.1);}}
      // fix@qf17 {{Swap arguments}}
      expect.fail(42, aNumber); // Noncompliant [[qf18]] {{Swap these 2 arguments so they are in the correct order: expect.fail(actual, expected).}}
      // edit@qf18 {{      expect.fail(aNumber, 42);}}
      // fix@qf18 {{Swap arguments}}
    });

    it("uses chai 'should'", function() {
      should.fail(42,
                //^^> {{Other argument to swap.}}
        aNumber); // Noncompliant [[qf19]] {{Swap these 2 arguments so they are in the correct order: should.fail(actual, expected).}}
      //^^^^^^^
      // edit@qf19@-2 {{      should.fail(aNumber,}}
      // edit@qf19 {{        42);}}
      // fix@qf19 {{Swap arguments}}
    });

    it("should increase coverage", function() {
      should.succeed(42, aNumber);
      expect(42).to.nothing(aNumber);
      expect(42).to.do.nothing(aNumber);
    });
});
