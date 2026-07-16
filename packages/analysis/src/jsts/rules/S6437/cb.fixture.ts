import crypto from 'node:crypto';

const dh = crypto.createDiffieHellman(512);
   dh.setPrivateKey('9f86d081884c7d659a2feaa0c55ad015'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
// ^^^^^^^^^^^^^^^^

const ecdh = crypto.createECDH('secp256k1');
  ecdh.setPrivateKey('4c7d659a2feaa0c55ad0159f86d08188'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
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
const verifyKey = 'kX3mRqZbN';
//                ^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  verify.verify(verifyKey, signature); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^

const x509 = new crypto.X509Certificate('public-cert.pem (imagine its imported)');
const value = x509.checkPrivateKey('zK4mNpXaR'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//            ^^^^^^^^^^^^^^^^^^^^

  crypto.createHmac('sha256', 'nK7dQzM3wXpLsc9'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^
crypto.createHmac('sha256', process.env.SECRET);

  crypto.createSecretKey('yT8vRhJ2mZqWuf5'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^
crypto.createSecretKey(Buffer.from(process.env.KEY || '', 'hex'));

const dataBuffer = Buffer.from('data');
const signatureBuffer = Buffer.from('signature');
  crypto.sign('sha256', dataBuffer, 'privateKeyPEM'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^
const privateKeyVar = 'pL8vTwYcQ';
//                    ^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  crypto.sign('sha256', dataBuffer, privateKeyVar); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^

  crypto.verify('sha256', dataBuffer, 'publicKeyPEM', signatureBuffer); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^
const publicKeyVar = 'uJ4nHsXeR';
//                   ^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  crypto.verify('sha256', dataBuffer, publicKeyVar, signatureBuffer); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^

  crypto.privateEncrypt('privateKeyPEM', Buffer.from('data')); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^
const privKey = 'fD6oGaMzK';
//              ^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  crypto.privateEncrypt(privKey, Buffer.from('data')); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^

const encData = Buffer.from('encrypted');
  crypto.privateDecrypt('privateKeyPEM', encData); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^
const privKey2 = 'hR9wEuTbL';
//               ^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  crypto.privateDecrypt(privKey2, encData); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^

import superagent from 'superagent';
  superagent.auth('svcuser:bH4xNc6oPa1zVtk'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^
const creds = 'svcacct:Kd7HqPz2';
//            ^^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  superagent.auth(creds); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^

import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();
app.disable('x-powered-by');
app.use(cookieParser('gU3eLw9jKdRy7hn')); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//      ^^^^^^^^^^^^
app.use(cookieParser(process.env.COOKIE_SECRET));

  cookieParser.JSONCookie('{"data":"value"}', 'rM5tCq8bFn2xWyd'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^
const jsonSecret = 'Qp9LmZxWaC';
//                 ^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  cookieParser.JSONCookie('{"data":"value"}', jsonSecret); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^

  cookieParser.signedCookie('cookieValue', 'wP6zHj4uYe0aLsq'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^
cookieParser.signedCookie('cookieValue', process.env.SECRET);

const cookiesObj = {};
  cookieParser.signedCookies(cookiesObj, 'xD9nKt3vRc7mBhw'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^
const cookieSecret = 'Rk3NvTgYeD';
//                   ^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  cookieParser.signedCookies(cookiesObj, cookieSecret); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^

import jwt from 'jsonwebtoken';
  jwt.sign({ userId: 123 }, 'qL2wYb8gTz5nMcx'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^
jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
const jwtSecret = 'Bn7WsPqXuF';
//                ^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  jwt.sign({ userId: 123 }, jwtSecret); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^

const tokenStr = 'token';
  jwt.verify(tokenStr, 'jN4pXr7dWk1sVhq'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^
jwt.verify(tokenStr, process.env.JWT_SECRET);
const jwtSecret2 = 'Ht5CzKdVmR';
//                 ^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  jwt.verify(tokenStr, jwtSecret2); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^

import session from 'express-session';
  session({ secret: 'oE6cUt9mLb3yNzf', name: 'connect.sid', cookie: { path: '/' } }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^
session({ secret: process.env.SESSION_SECRET, name: 'connect.sid' });
const sessionSecret = 'beautiful dog';
//                    ^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  session({ secret: sessionSecret }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^

import ldap from 'ldapjs';
const client = ldap.createClient({ url: 'ldap://localhost:389' });
  client.bind('cn=admin,dc=example,dc=org', 'sV1hMq5nRw8xKdb'); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^
client.bind('cn=admin,dc=example,dc=org', process.env.LDAP_PASSWORD);
const ldapPassword = 'Yw8GfNbSqL';
//                   ^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  client.bind('cn=admin,dc=example,dc=org', ldapPassword); // Noncompliant {{Revoke and change this password, as it is compromised.}}
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
  typeorm.createConnection({ // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^
  name: 'mysql',
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'aF7bJz2tYc4pQmh',
  database: 'acme',
  synchronize: true,
  logging: true,
  entities: [],
});

const typeormDbPass = 'aF7bJz2tYc4pQmh';
//                    ^^^^^^^^^^^^^^^^^ > {{Hardcoded value assigned here}}
  typeorm.createConnection({ // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^^
  type: 'mysql',
  host: 'localhost',
  password: typeormDbPass,
});

typeorm.createConnection({
  type: 'mysql',
  host: 'localhost',
  password: process.env.DB_PASSWORD,
});

import mysql from 'mysql';
  mysql.createConnection({ password: 'aF7bJz2tYc4pQmh' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^
mysql.createConnection({ password: process.env.DB_PASSWORD });

  mysql.createPool({ password: 'aF7bJz2tYc4pQmh' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^
mysql.createPool({ password: process.env.DB_PASSWORD });

import mysql2 from 'mysql2';
  mysql2.createConnection({ password: 'aF7bJz2tYc4pQmh' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^^^^^^^
mysql2.createConnection({ password: process.env.DB_PASSWORD });

  mysql2.createPool({ password: 'aF7bJz2tYc4pQmh' }); // Noncompliant {{Revoke and change this password, as it is compromised.}}
//^^^^^^^^^^^^^^^^^
mysql2.createPool({ password: process.env.DB_PASSWORD });

mysql.createConnection({ password: 'root' }); // Compliant, well-known placeholder value
session({ secret: 'changeit' }); // Compliant, well-known placeholder value
crypto.createHmac('sha256', '${HMAC_KEY}'); // Compliant, placeholder-shaped value

toString('not a secret'); // Compliant
