Script.load("myBigCodeLibrary.js");

Script.load("http://badguys.com/scaryCodeLibrary.js");  // NOK

var js = ["http://scaryscripts.com/scripts/shadedborder.js",  // NOK
          "scripts/main.js"];

include("http://hackers.com/steal.js")  // NOK

loadScript("http://evil.net/corrupt.js", function(){});  // NOK


var dirPath = "http://drevil.org/badStuff/";  // NOK

import {encodeValue, toQueryString} from '../src/QueryParams';

toBe('http:%2F%2F%25.com');

toBe('jeff&person=igor&person=tobias');
