const c = require('crypto');
c.createHash();
c.createHash(unknown);
c.createHash('sha512');
c.createNotHash('sha1');
   c.createHash('sha1'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
// ^^^^^^^^^^^^
c.createHash('SHA1'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('md2'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('md4'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('md5'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('md6'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('haval128'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('hmacmd5'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('dsa'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('ripemd'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('ripemd128'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('ripemd160'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
c.createHash('hmacripemd160'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}

const foo = require('crypto');
foo.createHash('sha1'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}

const createHash = require('crypto').createHash;
   createHash('sha1'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
// ^^^^^^^^^^
import * as crypto from 'crypto';
crypto.createHash('sha1'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}

const otpyrc = require('otpyrc');
otpyrc.createHash('sha1');

crypto.subtle.digest('SHA-512', data);
   crypto.subtle.digest('SHA-1', data); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
// ^^^^^^^^^^^^^^^^^^^^
notCrypto.subtle.digest('SHA-1', data);
crypto.notSubtle.digest('SHA-1', data);
crypto.subtle.notDigest('SHA-1', data);

// Truncated digest output — short identifier, cache key, ETag
crypto.createHash('sha1').update(x).digest('hex').slice(0, 8);
crypto.createHash('md5').update(url).digest('hex').substring(0, 4);
crypto.createHash('sha1').update(x).digest('hex').slice(-6);
crypto.createHash('md5').update(payload).digest().slice(0, 4);
crypto.createHash('sha1').update(p).digest('hex').toUpperCase().slice(0, 5);

const h1 = crypto.createHash('sha1').update(x).digest('hex');
h1.slice(0, 8);

const h2 = crypto.createHash('md5').update(x).digest('hex'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
useFully(h2);

crypto.createHash('sha1').update(x).digest('hex'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
crypto.createHash('md5').update(x).digest('hex').toString(); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}

// crypto.subtle.digest truncation — same idiom, async via await or .then
async function subtleTruncated() {
  const b1 = await crypto.subtle.digest('SHA-1', data);
  b1.slice(0, 4);

  (await crypto.subtle.digest('SHA-1', data)).slice(0, 4);

  crypto.subtle.digest('SHA-1', data).then(buf => buf.slice(0, 4));
  crypto.subtle.digest('SHA-1', data).then(function (buf) { return buf.slice(0, 4); });

  const b2 = await crypto.subtle.digest('SHA-1', data); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
  sendFully(b2);

  crypto.subtle.digest('SHA-1', data).then(buf => sendFully(buf)); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
}
