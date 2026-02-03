import crypto from 'node:crypto';

const dh = crypto.createDiffieHellman(512);
   dh.setPrivateKey('0123456789abcdef0123456789abcdef'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
// ^^^^^^^^^^^^^^^^

const ecdh = crypto.createECDH('secp256k1');
  ecdh.setPrivateKey('abcdef0123456789abcdef0123456789'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^

const sign = crypto.createSign('SHA256');
sign.write('some data to sign');
sign.end();
const signature = sign.sign('privateKeyPEM', 'hex'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//                ^^^^^^^^^

const verify = crypto.createVerify('SHA256');
verify.write('some data to verify');
verify.end();
  verify.verify('publicKeyPEM', signature); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^
const verifyKey = 'key';
//                ^^^^^ > {{Hardcoded value assigned here}}
  verify.verify(verifyKey, signature); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^

const x509 = new crypto.X509Certificate('public-cert.pem (imagine its imported)');
const value = x509.checkPrivateKey('key'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//            ^^^^^^^^^^^^^^^^^^^^

  crypto.createHmac('sha256', 'hardcodedSecret123'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^
crypto.createHmac('sha256', process.env.SECRET);

  crypto.createSecretKey('mySecretKey123'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^
crypto.createSecretKey(Buffer.from(process.env.KEY || '', 'hex'));

const dataBuffer = Buffer.from('data');
const signatureBuffer = Buffer.from('signature');
  crypto.sign('sha256', dataBuffer, 'privateKeyPEM'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^
const privateKeyVar = 'key';
//                    ^^^^^ > {{Hardcoded value assigned here}}
  crypto.sign('sha256', dataBuffer, privateKeyVar); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^

  crypto.verify('sha256', dataBuffer, 'publicKeyPEM', signatureBuffer); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^
const publicKeyVar = 'key';
//                   ^^^^^ > {{Hardcoded value assigned here}}
  crypto.verify('sha256', dataBuffer, publicKeyVar, signatureBuffer); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^

  crypto.privateEncrypt('privateKeyPEM', Buffer.from('data')); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^
const privKey = 'key';
//              ^^^^^ > {{Hardcoded value assigned here}}
  crypto.privateEncrypt(privKey, Buffer.from('data')); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^

const encData = Buffer.from('encrypted');
  crypto.privateDecrypt('privateKeyPEM', encData); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^
const privKey2 = 'key';
//               ^^^^^ > {{Hardcoded value assigned here}}
  crypto.privateDecrypt(privKey2, encData); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^

import superagent from 'superagent';
  superagent.auth('username:password123'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^
const creds = 'user:pass';
//            ^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  superagent.auth(creds); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^

import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();
app.disable('x-powered-by');
app.use(cookieParser('mySecretKey123')); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//      ^^^^^^^^^^^^
app.use(cookieParser(process.env.COOKIE_SECRET));

  cookieParser.JSONCookie('{"data":"value"}', 'secret123'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^
const jsonSecret = 'secret';
//                 ^^^^^^^^ > {{Hardcoded value assigned here}}
  cookieParser.JSONCookie('{"data":"value"}', jsonSecret); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^

  cookieParser.signedCookie('cookieValue', 'secretKey123'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^
cookieParser.signedCookie('cookieValue', process.env.SECRET);

const cookiesObj = {};
  cookieParser.signedCookies(cookiesObj, 'secretKey123'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^
const cookieSecret = 'secret';
//                   ^^^^^^^^ > {{Hardcoded value assigned here}}
  cookieParser.signedCookies(cookiesObj, cookieSecret); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^

import jwt from 'jsonwebtoken';
  jwt.sign({ userId: 123 }, 'mySecretKey123'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^
jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
const jwtSecret = 'secret';
//                ^^^^^^^^ > {{Hardcoded value assigned here}}
  jwt.sign({ userId: 123 }, jwtSecret); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^

const tokenStr = 'token';
  jwt.verify(tokenStr, 'mySecretKey123'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^
jwt.verify(tokenStr, process.env.JWT_SECRET);
const jwtSecret2 = 'secret';
//                 ^^^^^^^^ > {{Hardcoded value assigned here}}
  jwt.verify(tokenStr, jwtSecret2); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^

import session from 'express-session';
  session({ secret: 'hardcoded_secret', name: 'connect.sid', cookie: { path: '/' } }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^
session({ secret: process.env.SESSION_SECRET, name: 'connect.sid' });
const sessionSecret = 'beautiful dog';
//                    ^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  session({ secret: sessionSecret }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^

import cookieSession from 'cookie-session';
  cookieSession({ keys: ['e5ac-4ebf-03e5-9e29-a3f562e10b22'], name: 'session' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^
  cookieSession({ keys: ['key1', 'key2'], name: 'session' }); // Noncompliant 2
//^^^^^^^^^^^^^
cookieSession({ keys: [process.env.SESSION_KEY], name: 'session' });
const cookieKey = 'hardcoded-key';
//                ^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  cookieSession({ keys: [cookieKey] }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^
