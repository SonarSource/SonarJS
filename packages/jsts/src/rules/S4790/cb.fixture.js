const c = require('crypto');
c.createHash();
c.createHash(unknown);
c.createHash('sha512');
c.createNotHash('sha1');
   c.createHash('sha1'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
// ^^^^^^^^^^^^
c.createHash('SHA1'); // Noncompliant
c.createHash('md2'); // Noncompliant
c.createHash('md4'); // Noncompliant
c.createHash('md5'); // Noncompliant
c.createHash('md6'); // Noncompliant
c.createHash('haval128'); // Noncompliant
c.createHash('hmacmd5'); // Noncompliant
c.createHash('dsa'); // Noncompliant
c.createHash('ripemd'); // Noncompliant
c.createHash('ripemd128'); // Noncompliant
c.createHash('ripemd160'); // Noncompliant
c.createHash('hmacripemd160'); // Noncompliant

const foo = require('crypto');
foo.createHash('sha1'); // Noncompliant

const createHash = require('crypto').createHash;
   createHash('sha1'); // Noncompliant
// ^^^^^^^^^^
import crypto from 'crypto';
crypto.createHash('sha1'); // Noncompliant

const otpyrc = require('otpyrc');
otpyrc.createHash('sha1');

crypto.subtle.digest('SHA-512', data);
   crypto.subtle.digest('SHA-1', data); // Noncompliant
// ^^^^^^^^^^^^^^^^^^^^
notCrypto.subtle.digest('SHA-1', data);
crypto.notSubtle.digest('SHA-1', data);
crypto.subtle.notDigest('SHA-1', data);
