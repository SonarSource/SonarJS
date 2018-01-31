let arr = [];
let mySet = new Set();
let myMap = new Map();


if (mySet.size < 0) { } // Noncompliant {{The size is always ">=0", so fix this test to get the real expected behavior.}}
//  ^^^^^^^^^^^^^^
if (myMap.size < 0) { } // Noncompliant {{The size is always ">=0", so fix this test to get the real expected behavior.}}
//  ^^^^^^^^^^^^^^

if (arr.length < 0) { } // Noncompliant {{The length is always ">=0", so fix this test to get the real expected behavior.}}
//  ^^^^^^^^^^^^^^

if (arr.length >= 0) { } // Noncompliant {{The length is always ">=0", so fix this test to get the real expected behavior.}}
//  ^^^^^^^^^^^^^^^

// OK

if (arr.length < 1) { }
if (arr.length > 0) { }
if (arr.length <= 1) { }
if (arr.length >= 1) { }
if (arr.length < 50) { }
if (arr.length < 5 + 0) { }
if (obj.size() >= 0) { }
