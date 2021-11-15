const crypto = require('crypto');
crypto.createHash();
crypto.createHash(unknown);
crypto.createHash('sha512');
crypto.createNotHash('sha1');
crypto.createHash('sha1'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
//     ^^^^^^^^^^
crypto.createHash('SHA1'); // Noncompliant
crypto.createHash('md2'); // Noncompliant
crypto.createHash('md4'); // Noncompliant
crypto.createHash('md5'); // Noncompliant
crypto.createHash('md6'); // Noncompliant
crypto.createHash('haval128'); // Noncompliant
crypto.createHash('hmacmd5'); // Noncompliant
crypto.createHash('dsa'); // Noncompliant
crypto.createHash('ripemd'); // Noncompliant
crypto.createHash('ripemd128'); // Noncompliant
crypto.createHash('ripemd160'); // Noncompliant
crypto.createHash('hmacripemd160'); // Noncompliant

const foo = require('crypto');
foo.createHash('sha1'); // Noncompliant

const createHash = require('crypto').createHash;
   createHash('sha1'); // Noncompliant
// ^^^^^^^^^^
import * as crypto from 'crypto';
crypto.createHash('sha1'); // Noncompliant

const otpyrc = require('otpyrc');
otpyrc.createHash('sha1');
