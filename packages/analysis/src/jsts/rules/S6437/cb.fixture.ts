import crypto from 'node:crypto';

const dh = crypto.createDiffieHellman(512);
   dh.setPrivateKey('0123456789abcdef0123456789abcdef');
   dh.setPrivateKey('9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
// ^^^^^^^^^^^^^^^^

const ecdh = crypto.createECDH('secp256k1');
  ecdh.setPrivateKey('abcdef0123456789abcdef0123456789');
  ecdh.setPrivateKey('9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
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
verify.verify(verifyKey, signature);
const actualVerifyKey = '9f86d081884c7d659a2feaa0c55ad015';
//                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  verify.verify(actualVerifyKey, signature); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^

const x509 = new crypto.X509Certificate('public-cert.pem (imagine its imported)');
const value = x509.checkPrivateKey('key');
  x509.checkPrivateKey('9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^

  crypto.createHmac('sha256', 'hardcodedSecret123');
  crypto.createHmac('sha256', '9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^
crypto.createHmac('sha256', process.env.SECRET);

  crypto.createSecretKey('mySecretKey123');
  crypto.createSecretKey('9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^
crypto.createSecretKey(Buffer.from(process.env.KEY || '', 'hex'));

const dataBuffer = Buffer.from('data');
const signatureBuffer = Buffer.from('signature');
  crypto.sign('sha256', dataBuffer, 'privateKeyPEM'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^
const privateKeyVar = 'key';
  crypto.sign('sha256', dataBuffer, privateKeyVar);
const actualPrivateKey = '9f86d081884c7d659a2feaa0c55ad015';
//                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  crypto.sign('sha256', dataBuffer, actualPrivateKey); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^

  crypto.verify('sha256', dataBuffer, 'publicKeyPEM', signatureBuffer); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^
const publicKeyVar = 'key';
  crypto.verify('sha256', dataBuffer, publicKeyVar, signatureBuffer);
const actualPublicKey = '9f86d081884c7d659a2feaa0c55ad015';
//                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  crypto.verify('sha256', dataBuffer, actualPublicKey, signatureBuffer); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^

  crypto.privateEncrypt('privateKeyPEM', Buffer.from('data')); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^
const privKey = 'key';
  crypto.privateEncrypt(privKey, Buffer.from('data'));
const actualPrivateEncryptionKey = '9f86d081884c7d659a2feaa0c55ad015';
//                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  crypto.privateEncrypt(actualPrivateEncryptionKey, Buffer.from('data')); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^

const encData = Buffer.from('encrypted');
  crypto.privateDecrypt('privateKeyPEM', encData); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^
const privKey2 = 'key';
  crypto.privateDecrypt(privKey2, encData);
const actualPrivateDecryptionKey = '9f86d081884c7d659a2feaa0c55ad015';
//                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  crypto.privateDecrypt(actualPrivateDecryptionKey, encData); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^

import superagent from 'superagent';
  superagent.auth('username:password123');
  superagent.auth('svcuser:9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^
const creds = 'user:pass';
  superagent.auth(creds);
const actualCreds = 'svcacct:9f86d081884c7d659a2feaa0c55ad015';
//                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  superagent.auth(actualCreds); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^

import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();
app.disable('x-powered-by');
app.use(cookieParser('mySecretKey123'));
app.use(cookieParser('9f86d081884c7d659a2feaa0c55ad015')); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//      ^^^^^^^^^^^^
app.use(cookieParser(process.env.COOKIE_SECRET));

  cookieParser.JSONCookie('{"data":"value"}', 'secret123');
  cookieParser.JSONCookie('{"data":"value"}', '9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^
const jsonSecret = 'secret';
  cookieParser.JSONCookie('{"data":"value"}', jsonSecret);
const actualJsonSecret = '9f86d081884c7d659a2feaa0c55ad015';
//                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  cookieParser.JSONCookie('{"data":"value"}', actualJsonSecret); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^

  cookieParser.signedCookie('cookieValue', 'secretKey123');
  cookieParser.signedCookie('cookieValue', '9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^
cookieParser.signedCookie('cookieValue', process.env.SECRET);

const cookiesObj = {};
  cookieParser.signedCookies(cookiesObj, 'secretKey123');
  cookieParser.signedCookies(cookiesObj, '9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^
const cookieSecret = 'secret';
  cookieParser.signedCookies(cookiesObj, cookieSecret);
const actualCookieSecret = '9f86d081884c7d659a2feaa0c55ad015';
//                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  cookieParser.signedCookies(cookiesObj, actualCookieSecret); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^

import jwt from 'jsonwebtoken';
  jwt.sign({ userId: 123 }, 'mySecretKey123');
  jwt.sign({ userId: 123 }, '9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^
jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
const jwtSecret = 'secret';
  jwt.sign({ userId: 123 }, jwtSecret);
const actualJwtSecret = '9f86d081884c7d659a2feaa0c55ad015';
//                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  jwt.sign({ userId: 123 }, actualJwtSecret); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^

const tokenStr = 'token';
  jwt.verify(tokenStr, 'mySecretKey123');
  jwt.verify(tokenStr, '9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^
jwt.verify(tokenStr, process.env.JWT_SECRET);
const jwtSecret2 = 'secret';
  jwt.verify(tokenStr, jwtSecret2);
const actualJwtSecret2 = '9f86d081884c7d659a2feaa0c55ad015';
//                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  jwt.verify(tokenStr, actualJwtSecret2); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^

import session from 'express-session';
  session({ secret: 'hardcoded_secret', name: 'connect.sid', cookie: { path: '/' } });
  session({ secret: '9f86d081884c7d659a2feaa0c55ad015', name: 'connect.sid', cookie: { path: '/' } }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^
session({ secret: process.env.SESSION_SECRET, name: 'connect.sid' });
const sessionSecret = 'beautiful dog';
//                    ^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  session({ secret: sessionSecret }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^

import ldap from 'ldapjs';
const client = ldap.createClient({ url: 'ldap://localhost:389' });
  client.bind('cn=admin,dc=example,dc=org', 'hardcodedPassword123');
  client.bind('cn=admin,dc=example,dc=org', '9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^
client.bind('cn=admin,dc=example,dc=org', process.env.LDAP_PASSWORD);
const ldapPassword = 'secret';
  client.bind('cn=admin,dc=example,dc=org', ldapPassword);
const actualLdapPassword = '9f86d081884c7d659a2feaa0c55ad015';
//                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  client.bind('cn=admin,dc=example,dc=org', actualLdapPassword); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^
import cookieSession from 'cookie-session';
  cookieSession({ keys: ['f6dc-5eba-13e5-9e29-b3f662e10b89'], name: 'session' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^
cookieSession({ keys: [process.env.SESSION_KEY], name: 'session' });
const cookieKey = 'hardcoded-key';
//                ^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  cookieSession({ keys: [cookieKey] }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^

import typeorm from 'typeorm';
  typeorm.createConnection({
  name: 'mysql',
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'acme',
  synchronize: true,
  logging: true,
  entities: [],
});
  typeorm.createConnection({ password: '9f86d081884c7d659a2feaa0c55ad015' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^

const typeormDbPass = 'root';
  typeorm.createConnection({
  type: 'mysql',
  host: 'localhost',
  password: typeormDbPass,
});
const actualTypeormDbPass = '9f86d081884c7d659a2feaa0c55ad015';
//                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  typeorm.createConnection({ // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^
  type: 'mysql',
  host: 'localhost',
  password: actualTypeormDbPass,
});

typeorm.createConnection({
  type: 'mysql',
  host: 'localhost',
  password: process.env.DB_PASSWORD,
});

import mysql from 'mysql';
  mysql.createConnection({ password: 'root' });
  mysql.createConnection({ password: '9f86d081884c7d659a2feaa0c55ad015' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^
mysql.createConnection({ password: process.env.DB_PASSWORD });

  mysql.createPool({ password: 'root' });
  mysql.createPool({ password: '9f86d081884c7d659a2feaa0c55ad015' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^
mysql.createPool({ password: process.env.DB_PASSWORD });

import mysql2 from 'mysql2';
  mysql2.createConnection({ password: 'root' });
  mysql2.createConnection({ password: '9f86d081884c7d659a2feaa0c55ad015' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^
mysql2.createConnection({ password: process.env.DB_PASSWORD });

  mysql2.createPool({ password: 'root' });
  mysql2.createPool({ password: '9f86d081884c7d659a2feaa0c55ad015' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^
mysql2.createPool({ password: process.env.DB_PASSWORD });

session({ secret: 'changeit' }); // Compliant, well-known placeholder value
crypto.createHmac('sha256', '${HMAC_KEY}'); // Compliant, placeholder-shaped value

toString('not a secret'); // Compliant

const shadowRoot = '9f86d081884c7d659a2feaa0c55ad015';
//                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
const shadowAlias = shadowRoot;
{
  const shadowRoot = shadowAlias;
    crypto.createHmac('sha256', shadowRoot); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//  ^^^^^^^^^^^^^^^^^
}
