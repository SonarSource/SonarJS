const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('chai').should();

describe("test the same object", function() {
    const obj = "";
    const other = "";

    it("uses chai 'assert'", function() {
        assert.equal(obj,   // Noncompliant {{Replace this argument or its duplicate.}}
//                   ^^^
                     obj);
//                   ^^^<
        // ok when literals
        assert.equal(42, 42);
        assert.equal('foo', 'foo');
        assert.closeTo(obj, 0.5, 0.5);

        assert.equal(obj, other, obj); // Noncompliant
        assert.equal(1 + 1, 1+1); // Noncompliant

        assert.isOk(obj, obj);  // Noncompliant
        assert.isNotOk(obj, obj); // Noncompliant
        assert.notEqual(obj, other, obj);  // Noncompliant
        assert.otherVal(obj, 1, 2, obj);  // Noncompliant

        notAssert.otherVal(obj, 1, 2, obj);
        otherVal(obj, 1, 2, obj);
    });

    it("uses chai 'expect'", function() {
      expect(obj).a(obj, other);  // Noncompliant
      expect(other).a(obj, obj);  // Noncompliant
      expect(obj).to.be.a(obj);  // Noncompliant
      expect(obj).to.be.an(obj).that.is.empty; // Noncompliant
      expect(obj).to.be.an(obj).that.includes(2);// Noncompliant

      // ok when literals
      expect(obj).closeTo(other, 0.5, 0.5);

      expect(obj).include(obj, other)  // Noncompliant
      expect(obj).ownPropertyDescriptor(obj, 1, 2)  // Noncompliant
      expect.fail(obj, obj, other)  // Noncompliant

      notExpect(obj).to.be.an(obj).that.includes(2);
      expect(err).to.be.an('error', 'error'); // OK
    });

    it("uses chai 'should'", function() {
      should.fail(obj, obj, other);  // Noncompliant
      obj.should.a(obj, other); // Noncompliant

      obj.should.have.property(obj).with.lengthOf(3); // Noncompliant
      obj.should.have.property(3).with.lengthOf(obj); // Noncompliant
      ({}).should.have.property(obj).with.lengthOf(obj); // Noncompliant

      obj.notShould.a(obj, other);
    });


});
