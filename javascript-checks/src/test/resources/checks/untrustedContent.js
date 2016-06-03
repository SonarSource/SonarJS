Script.load("myBigCodeLibrary.js");

Script.load("http://badguys.com/scaryCodeLibrary.js");  // Noncompliant {{Remove this content from an untrusted source.}}
//          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
var js = ["http://scaryscripts.com/scripts/shadedborder.js",  // Noncompliant
          "scripts/main.js"];

include("http://hackers.com/steal.js")  // Noncompliant

loadScript("http://evil.net/corrupt.js", function(){});  // Noncompliant


var dirPath = "http://drevil.org/badStuff/";  // NOK

import {encodeValue, toQueryString} from '../src/QueryParams';

toBe('http:%2F%2F%25.com');

toBe('jeff&person=igor&person=tobias');
