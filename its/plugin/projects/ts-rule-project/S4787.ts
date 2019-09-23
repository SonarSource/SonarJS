import * as crypto from 'crypto';

const cipher = crypto.createCipher(algo, key); // Noncompliant
const cipheriv = crypto.createCipheriv(algo, key, iv); // Noncompliant
const decipher = crypto.createDecipher(algo, key); // Noncompliant
const decipheriv = crypto.createDecipheriv(algo, key, iv); // Noncompliant
const pubEnc = crypto.publicEncrypt(key, buf); // Noncompliant
const pubDec = crypto.publicDecrypt(key, privEnc); // Noncompliant
